/**
 * Event controller
 */
const { readEvents, writeEvents } = require('../utils/fileSystem');
const { generateId } = require('../utils/idGenerator');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { MESSAGES, HTTP_STATUS } = require('../config/constants');

/**
 * Get all events
 */
const getAllEvents = (req, res) => {
  const data = readEvents();
  sendSuccess(res, data.events || []);
};

/**
 * Get event by ID
 */
const getEventById = (req, res) => {
  const { id } = req.params;
  const data = readEvents();
  
  if (!data.events || !Array.isArray(data.events)) {
    return sendError(res, MESSAGES.ERROR.EVENT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }
  
  const event = data.events.find(e => e.id === id);
  
  if (!event) {
    return sendError(res, MESSAGES.ERROR.EVENT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }
  
  sendSuccess(res, event);
};

/**
 * Create new event
 */
const createEvent = (req, res) => {
  const eventData = req.body;
  const data = readEvents();
  
  if (!data.events) {
    data.events = [];
  }
  
  const event = {
    ...eventData,
    id: eventData.id || generateId(),
    createdAt: eventData.createdAt || new Date().toISOString()
  };
  
  data.events.push(event);
  
  if (writeEvents(data)) {
    sendSuccess(res, event, HTTP_STATUS.CREATED);
  } else {
    sendError(res, MESSAGES.ERROR.FAILED_TO_SAVE, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Update event by ID
 */
const updateEvent = (req, res) => {
  const { id } = req.params;
  const updatedEvent = req.body;
  const data = readEvents();
  
  if (!data.events || !Array.isArray(data.events)) {
    return sendError(res, MESSAGES.ERROR.EVENT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }
  
  const index = data.events.findIndex(e => e.id === id);
  
  if (index === -1) {
    return sendError(res, MESSAGES.ERROR.EVENT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }
  
  data.events[index] = { ...data.events[index], ...updatedEvent };
  
  if (writeEvents(data)) {
    sendSuccess(res, data.events[index]);
  } else {
    sendError(res, MESSAGES.ERROR.FAILED_TO_UPDATE, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Delete event by ID
 */
const deleteEvent = (req, res) => {
  const { id } = req.params;
  const data = readEvents();
  
  if (!data.events || !Array.isArray(data.events)) {
    return sendError(res, MESSAGES.ERROR.EVENT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }
  
  const index = data.events.findIndex(e => e.id === id);
  
  if (index === -1) {
    return sendError(res, MESSAGES.ERROR.EVENT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }
  
  data.events.splice(index, 1);
  
  if (writeEvents(data)) {
    sendSuccess(res, { message: MESSAGES.SUCCESS.EVENT_DELETED });
  } else {
    sendError(res, MESSAGES.ERROR.FAILED_TO_DELETE, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};

module.exports = {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent
};
