require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

const app = express();
const port = 3000;

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
};
app.use(cors(corsOptions));
app.use(bodyParser.json());

// Lấy API key từ biến môi trường
const apiKey = process.env.API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// Knowledge base storage
let knowledgeBase = {};

// Function to load PDF file and extract text
async function loadPDFKnowledge(filePath, knowledgeKey, metadata = {}) {
  try {
    console.log(`Loading knowledge file: ${filePath}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return;
    }
    
    // Read the PDF file
    const dataBuffer = fs.readFileSync(filePath);
    
    // Parse PDF content (with max page limit for very large files)
    const options = metadata.maxPages ? {max: metadata.maxPages} : {};
    const data = await pdfParse(dataBuffer, options);
    
    // Split content into sections based on file type
    let sections = [];
    
    // Different segmentation approaches based on document type
    if (metadata.segmentationPattern) {
      // Use custom segmentation pattern if provided
      sections = data.text.split(new RegExp(metadata.segmentationPattern, 'g'))
        .filter(section => section.trim().length > 0);
    } else {
      // Default segmentation (chapters and sections)
      sections = data.text.split(/Chapter \d+|Section \d+\.\d+|\d+\.\d+\s+[A-Z]/g)
        .filter(section => section.trim().length > 0);
    }
    
    // If we have very few sections, try to create more by splitting on paragraphs
    if (sections.length < 5) {
      sections = data.text.split(/\n\n+/)
        .filter(section => section.trim().length > 50); // Filter out short paragraphs
    }
    
    // Store in knowledge base with provided key
    knowledgeBase[knowledgeKey] = {
      title: metadata.title || path.basename(filePath, path.extname(filePath)),
      content: data.text,
      sections: sections,
      summary: metadata.summary || `Knowledge from ${path.basename(filePath)}`,
      keywords: metadata.keywords || [],
      subject: metadata.subject || 'general',
      fileSize: (dataBuffer.length / (1024 * 1024)).toFixed(2) + " MB", // Size in MB
      pageCount: data.numpages || "Unknown"
    };
    
    console.log(`Successfully loaded knowledge file: ${knowledgeKey} (${data.numpages || "Unknown"} pages, ${(dataBuffer.length / (1024 * 1024)).toFixed(2)} MB)`);
  } catch (error) {
    console.error(`Error loading knowledge file ${filePath}:`, error);
    // Add to knowledge base anyway with error information
    knowledgeBase[knowledgeKey] = {
      title: metadata.title || path.basename(filePath, path.extname(filePath)),
      error: `Failed to parse: ${error.message}`,
      subject: metadata.subject || 'general',
      status: 'error'
    };
  }
}

// Function to search knowledge base for relevant information
function searchKnowledge(query, knowledgeKey) {
  if (!knowledgeBase[knowledgeKey] || !knowledgeBase[knowledgeKey].sections) {
    return null;
  }
  
  // Extract key terms from the query for better matching
  const queryTerms = extractKeyTerms(query);
  
  // Simple keyword matching (a more sophisticated approach would use embeddings)
  const sections = knowledgeBase[knowledgeKey].sections;
  const scoredSections = sections.map(section => {
    // Calculate relevance score based on term frequency
    let score = 0;
    queryTerms.forEach(term => {
      // Count occurrences of the term in the section
      const regex = new RegExp(term, 'gi');
      const matches = section.match(regex);
      if (matches) {
        score += matches.length;
      }
    });
    return { section, score };
  });
  
  // Sort sections by relevance score (highest first)
  const sortedSections = scoredSections
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.section);
  
  // Return the most relevant sections (limit to avoid token overflow)
  const MAX_CHARS = 6000; // Adjust based on model's context window
  let result = '';
  
  for (const section of sortedSections) {
    if (result.length + section.length <= MAX_CHARS) {
      result += section + '\n\n';
    } else {
      // Truncate last section to fit within limit
      const remainingChars = MAX_CHARS - result.length;
      if (remainingChars > 200) { // Only add if we can include a meaningful amount
        result += section.substring(0, remainingChars) + '...';
      }
      break;
    }
  }
  
  return result || null;
}

// Extract key terms from query for better search
function extractKeyTerms(query) {
  // Convert to lowercase and remove punctuation
  const cleanQuery = query.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
  
  // Split into words
  const words = cleanQuery.split(/\s+/);
  
  // Filter out common stop words
  const stopWords = [
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 
    'what', 'when', 'where', 'who', 'why', 'how', 'can', 'will', 'should',
    'do', 'does', 'did', 'has', 'have', 'had', 'been', 'being', 'be',
    'this', 'that', 'these', 'those', 'to', 'for', 'with', 'about', 'of',
    'in', 'on', 'at', 'by', 'from', 'up', 'down', 'into', 'over'
  ];
  
  // Return only meaningful words (not stop words and at least 3 characters)
  return words.filter(word => !stopWords.includes(word) && word.length >= 3);
}

// Detect query subject to select appropriate knowledge source
function detectQuerySubject(message) {
  // Create a mapping of subjects to their relevant keywords
  const subjectKeywords = {
    calculus: ['calculus', 'derivative', 'integral', 'limit', 'differential', 'function', 'theorem', 'converge', 'series', 'taylor', 'vector', 'gradient', 'stewart', 'math', 'mathematics'],
    biology: ['biology', 'cell', 'dna', 'rna', 'protein', 'gene', 'evolution', 'organism', 'ecosystem', 'campbell', 'molecule', 'tissue', 'organ', 'photosynthesis', 'respiration', 'species'],
    quantum: ['quantum', 'physics', 'electron', 'particle', 'wave', 'qubit', 'superposition', 'entanglement', 'uncertainty', 'schrodinger', 'heisenberg', 'bohr', 'planck', 'mechanics'],
    machinelearning: ['machine learning', 'ml', 'neural network', 'deep learning', 'ai', 'artificial intelligence', 'model', 'training', 'dataset', 'feature', 'algorithm', 'classification', 'regression', 'supervised', 'unsupervised', 'reinforcement'],
    probabilisticai: ['probabilistic', 'bayesian', 'probability', 'random variable', 'distribution', 'inference', 'graphical model', 'markov', 'monte carlo', 'uncertainty', 'prior', 'posterior', 'likelihood', 'sampling', 'belief network', 'pgm']
  };
  
  // Convert message to lowercase for case-insensitive matching
  const lowercaseMessage = message.toLowerCase();
  
  // Check each subject's keywords and track match count
  const subjectScores = {};
  
  for (const [subject, keywords] of Object.entries(subjectKeywords)) {
    // Count how many keywords match
    let matchCount = 0;
    keywords.forEach(keyword => {
      if (lowercaseMessage.includes(keyword)) {
        matchCount++;
      }
    });
    
    // Store the score for this subject
    if (matchCount > 0) {
      subjectScores[subject] = matchCount;
    }
  }
  
  // Return the subject with the highest number of keyword matches
  if (Object.keys(subjectScores).length > 0) {
    const bestSubject = Object.entries(subjectScores)
      .sort((a, b) => b[1] - a[1])[0][0];
    return bestSubject;
  }
  
  // Default to general if no specific subject is detected
  return 'general';
}

// Initialize knowledge base on server start
async function initializeKnowledgeBase() {
  const knowledgeDir = path.join(__dirname, 'knowledge');
  
  // Create knowledge directory if it doesn't exist
  if (!fs.existsSync(knowledgeDir)) {
    fs.mkdirSync(knowledgeDir, { recursive: true });
    console.log('Created knowledge directory');
  }
  
  // Load configured knowledge files with metadata
  const knowledgeFiles = [
    { 
      path: path.join(knowledgeDir, 'calculus_stewart_7th.pdf'), 
      key: 'calculusStewart',
      metadata: {
        title: 'Calculus 7th Edition by James Stewart',
        summary: 'Comprehensive calculus textbook covering limits, derivatives, integrals, and applications',
        keywords: ['calculus', 'derivative', 'integral', 'limit', 'math'],
        subject: 'calculus'
      }
    },
    { 
      path: path.join(knowledgeDir, 'CampbellBiology11thEdition.pdf'), 
      key: 'campbellBiology',
      metadata: {
        title: 'Campbell Biology 11th Edition',
        summary: 'Comprehensive biology textbook covering cells, genetics, evolution, and ecosystems',
        keywords: ['biology', 'cell', 'dna', 'rna', 'protein', 'gene'],
        subject: 'biology',
        maxPages: 200 // Limit parsing to first 200 pages due to large file size
      }
    },
    { 
      path: path.join(knowledgeDir, 'Introduction to Quantum...ersity ofManchester.pdf'), 
      key: 'quantumIntro',
      metadata: {
        title: 'Introduction to Quantum Mechanics - University of Manchester',
        summary: 'Introduction to the principles of quantum mechanics, including wave-particle duality, Schrödinger equation, and quantum systems',
        keywords: ['quantum', 'mechanics', 'physics', 'wave', 'particle'],
        subject: 'quantum'
      }
    },
    { 
      path: path.join(knowledgeDir, 'machine-learning-yearning.pdf'), 
      key: 'mlYearning',
      metadata: {
        title: 'Machine Learning Yearning by Andrew Ng',
        summary: 'Practical guide to machine learning projects and strategies for building effective ML systems',
        keywords: ['machine learning', 'deep learning', 'neural network', 'AI', 'algorithm'],
        subject: 'machinelearning'
      }
    },
    { 
      path: path.join(knowledgeDir, 'Probabilistic Artificial Intelligence.pdf'), 
      key: 'probAI',
      metadata: {
        title: 'Probabilistic Artificial Intelligence',
        summary: 'Textbook covering probabilistic approaches to artificial intelligence, Bayesian inference, and probabilistic graphical models',
        keywords: ['bayesian', 'probability', 'graphical model', 'inference', 'uncertainty'],
        subject: 'probabilisticai'
      }
    }
  ];
  
  // Load each knowledge file
  console.log(`Loading ${knowledgeFiles.length} knowledge files...`);
  for (const file of knowledgeFiles) {
    if (fs.existsSync(file.path)) {
      await loadPDFKnowledge(file.path, file.key, file.metadata);
    } else {
      console.log(`Knowledge file not found: ${file.path}`);
    }
  }
  console.log('Knowledge base initialization complete.');
}

// Initialize knowledge base
initializeKnowledgeBase().catch(err => {
  console.error('Error initializing knowledge base:', err);
});

// Get the appropriate knowledge base based on query subject
function getRelevantKnowledge(message) {
  const subject = detectQuerySubject(message);
  
  let relevantKnowledge = '';
  let knowledgeSource = '';
  
  // Find knowledge bases that match the detected subject
  const matchingKnowledgeBases = Object.entries(knowledgeBase)
    .filter(([key, data]) => data.subject === subject && !data.error);
  
  if (matchingKnowledgeBases.length > 0) {
    // Get the first matching knowledge base (can be improved to select the best one)
    const [key, data] = matchingKnowledgeBases[0];
    relevantKnowledge = searchKnowledge(message, key);
    knowledgeSource = data.title;
  }
  
  return { relevantKnowledge, knowledgeSource, subject };
}

// Get a human-readable topic name based on the subject code
function getTopicName(subject) {
  const topicNames = {
    'calculus': 'giải tích (calculus)',
    'biology': 'sinh học (biology)',
    'quantum': 'cơ học lượng tử (quantum mechanics)',
    'machinelearning': 'học máy (machine learning)',
    'probabilisticai': 'trí tuệ nhân tạo xác suất (probabilistic artificial intelligence)',
    'general': 'chủ đề tổng quát'
  };
  
  return topicNames[subject] || subject;
}

// API endpoints
app.post('/generate', async (req, res) => {
  try {
    const { message, chatHistory } = req.body;
    
    // Get relevant knowledge if applicable
    const { relevantKnowledge, knowledgeSource, subject } = getRelevantKnowledge(message);
    
    // Create system instruction with knowledge context if available
    let systemInstruction = "Bạn tên là Khôi, bạn là một giáo sư chuyên về nghiên cứu và hỗ trợ học tập. Bạn sẽ giúp trả lời các câu hỏi về việc học tập và nghiên cứu.(Bạn có khả năng giúp học sinh làm toán, lý, hoá, nghiên cứu khoa học, và viết báo cáo, bài luận, bài báo, bài văn các loại.)";
    
    if (relevantKnowledge) {
      const topicName = getTopicName(subject);
      systemInstruction += `\n\nKhi trả lời câu hỏi về ${topicName}, bạn sẽ tham khảo thông tin từ sách ${knowledgeSource}:\n\n${relevantKnowledge}`;
    }
    
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-thinking-exp-01-21", 
      systemInstruction: systemInstruction,
    });

    const prompt = chatHistory.map(entry => 
      `${entry.role === 'user' ? 'User' : 'Bot'}: ${entry.content}`
    ).join('\n') + `\nUser: ${message}\nBot:`;

    const result = await model.generateContent(prompt);
    res.json({ response: result.response.text() });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Add endpoint to manage knowledge files
app.post('/knowledge/add', async (req, res) => {
  try {
    // This would require file upload handling, which is simplified here
    // In a real implementation, you would use a library like multer
    const { filePath, key, metadata } = req.body;
    
    if (!filePath || !key) {
      return res.status(400).json({ error: "Missing filePath or key" });
    }
    
    await loadPDFKnowledge(filePath, key, metadata || {});
    res.json({ success: true, message: `Knowledge file added: ${key}` });
  } catch (error) {
    console.error('Error adding knowledge file:', error);
    res.status(500).json({ error: "Failed to add knowledge file" });
  }
});

// Get list of loaded knowledge files
app.get('/knowledge/list', (req, res) => {
  const knowledgeSummary = Object.entries(knowledgeBase).map(([key, data]) => ({
    key,
    title: data.title,
    subject: data.subject,
    status: data.error ? 'error' : 'loaded',
    fileSize: data.fileSize || 'Unknown',
    pageCount: data.pageCount || 'Unknown',
    sections: data.sections ? data.sections.length : 0,
    summary: data.summary || data.error || 'No summary available'
  }));
  
  res.json({ 
    knowledge: knowledgeSummary,
    totalFiles: knowledgeSummary.length,
    loadedFiles: knowledgeSummary.filter(item => item.status !== 'error').length
  });
});

// Force reload of a specific knowledge file or all files
app.post('/knowledge/reload', async (req, res) => {
  try {
    const { key } = req.body;
    
    if (key) {
      // Reload specific file
      const knowledgeFile = Object.entries(knowledgeFiles).find(([_, data]) => data.key === key);
      if (!knowledgeFile) {
        return res.status(404).json({ error: `Knowledge file with key ${key} not found` });
      }
      
      await loadPDFKnowledge(knowledgeFile.path, knowledgeFile.key, knowledgeFile.metadata || {});
      res.json({ success: true, message: `Reloaded knowledge file: ${key}` });
    } else {
      // Reload all files
      await initializeKnowledgeBase();
      res.json({ success: true, message: `Reloaded all knowledge files` });
    }
  } catch (error) {
    console.error('Error reloading knowledge files:', error);
    res.status(500).json({ error: "Failed to reload knowledge files" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});