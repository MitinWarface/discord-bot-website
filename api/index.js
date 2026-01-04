// Vercel API endpoint to handle both bot and dashboard
const client = require('../index.js');
const dashboard = require('../dashboard/server.js');

module.exports = async (req, res) => {
  // Check if this is a Discord interaction (bot webhook)
  if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
    // Handle Discord bot interactions
    // For now, we'll return a simple response since the bot runs continuously
    return res.status(20).json({ message: 'Bot is running' });
  } else {
    // Handle dashboard requests
    // Pass the request to the dashboard server
    return dashboard(req, res);
  }
};