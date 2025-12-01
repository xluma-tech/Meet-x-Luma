/**
 * File system utilities
 */
const fs = require('fs');
const path = require('path');

// Data storage paths
const DATA_DIR = path.join(__dirname, '../../data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const MODELS_DIR = path.join(DATA_DIR, 'models');

/**
 * Ensure required directories exist
 */
const ensureDirectories = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
  }
};

/**
 * Initialize events file if it doesn't exist
 */
const initializeEventsFile = () => {
  if (!fs.existsSync(EVENTS_FILE)) {
    fs.writeFileSync(EVENTS_FILE, JSON.stringify({ events: [] }, null, 2));
  }
};

/**
 * Read events from file
 * @returns {Object} Events data
 */
const readEvents = () => {
  try {
    const data = fs.readFileSync(EVENTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading events:', error);
    return { events: [] };
  }
};

/**
 * Write events to file
 * @param {Object} data - Events data to write
 * @returns {boolean} Success status
 */
const writeEvents = (data) => {
  try {
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing events:', error);
    return false;
  }
};

/**
 * Delete a file
 * @param {string} filePath - Path to file
 */
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};

/**
 * Check if file exists
 * @param {string} filePath - Path to file
 * @returns {boolean} File exists
 */
const fileExists = (filePath) => {
  return fs.existsSync(filePath);
};

module.exports = {
  DATA_DIR,
  EVENTS_FILE,
  MODELS_DIR,
  ensureDirectories,
  initializeEventsFile,
  readEvents,
  writeEvents,
  deleteFile,
  fileExists
};
