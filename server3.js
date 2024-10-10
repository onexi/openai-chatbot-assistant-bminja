// Load environment variables
import dotenv from 'dotenv';
dotenv.config();
import OpenAI from 'openai';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files from the 'public' directory

// State dictionary
let state = {
  assistant_id: null,
  assistant_name: null,
  threadId: null,
  messages: [],
  user_message: null,
};

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Adjust the code in your route to fetch the assistants
app.post('/api/assistants', async (req, res) => {
    const assistantIdOrName = req.body.id; // Get the ID or name from the request
    try {
      const assistantsResponse = await openai.beta.assistants.list(); // Fetch the assistants
      const assistants = assistantsResponse.data; // Get the array of assistants
  
      // Check if assistants exist
      if (!assistants || assistants.length === 0) {
        return res.status(404).json({ error: 'No assistants found' });
      }
  
      // Find the assistant by ID or name
      const myAssistant = assistants.find(asst => asst.id === assistantIdOrName || asst.name === assistantIdOrName);
  
      if (myAssistant) {
        state.assistant_id = myAssistant.id;
        state.assistant_name = myAssistant.name;
        res.status(200).json(state); // Return the updated state
      } else {
        res.status(404).json({ error: 'Assistant not found' });
      }
    } catch (error) {
      console.error('Error fetching assistants:', error);
      res.status(500).json({ error: 'Failed to fetch assistants' });
    }
  });  

// Route to create a new Thread
app.post('/api/threads', async (req, res) => {
  try {
    const response = await openai.beta.threads.create(); // Create a new thread
    state.threadId = response.id;
    state.messages = []; // Reset messages
    res.json({ threadId: state.threadId });
  } catch (error) {
    console.error('Error creating thread:', error);
    res.status(500).json({ error: 'Failed to create thread' });
  }
});

// Route to handle incoming user messages
app.post('/api/threads/:threadId/messages', async (req, res) => {
  const { threadId } = req.params;
  const { role, content } = req.body;
  
  // Store message in the state
  state.messages.unshift({ role, content });
  
  // Acknowledge the message has been received
  res.status(200).json({ success: true });
});

// Route to run the Assistant
app.post('/api/run', async (req, res) => {
  const { message } = req.body;
  state.user_message = message;

  // Log the messages to check their structure
  console.log('Send messages:', state.messages);

  try {
    // Send message to the thread
    await openai.beta.threads.messages.create(state.threadId, {
      role: "user",
      content: message,
    });

    // Run the assistant and poll for completion
    const run = await openai.beta.threads.runs.createAndPoll(state.threadId, {
      assistant_id: state.assistant_id
    });

    // Retrieve the messages after running the assistant
    const messagesResponse = await openai.beta.threads.messages.list(state.threadId);
    const messages = messagesResponse.data; // Get the actual messages data

    // Format messages to strings
    const formattedMessages = messages.map(msg => {
      const contentText = Array.isArray(msg.content)
        ? msg.content.map(part => part.text ? part.text.value : part).join('') // Join content if it's an array
        : msg.content; // Handle if content is not an array
      return { role: msg.role, content: contentText }; // Create an object with role and string content
    });

    state.messages = formattedMessages; // Update state with all messages

    // Log the messages to check their structure
    console.log('Retrieved messages:', state.messages);

    // Send the run_id along with messages
    res.json({ messages: state.messages, run_id: run.id }); // Include run_id in the response

  } catch (error) {
    console.error('Error running assistant:', error);
    res.status(500).json({ error: 'Failed to run assistant' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
