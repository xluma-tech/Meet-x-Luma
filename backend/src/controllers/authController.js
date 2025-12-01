const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/responseHelper');

/**
 * Sync user from Auth0 to MongoDB
 */
const syncUser = async (req, res) => {
  try {
    const { auth0Id, email, name, picture } = req.body;

    if (!auth0Id || !email) {
      return sendError(res, 'auth0Id and email are required', 400);
    }

    // Check if user exists
    let user = await User.findByAuth0Id(auth0Id);

    if (!user) {
      // Create new user
      user = await User.create({
        auth0Id,
        email,
        name,
        picture,
        role: 'participant',
      });

      return sendSuccess(res, {
        message: 'User created successfully',
        user,
        isNewUser: true,
      }, 201);
    } else {
      // Update last login
      await User.updateLastLogin(auth0Id);

      return sendSuccess(res, {
        message: 'User updated successfully',
        user,
        isNewUser: false,
      });
    }
  } catch (error) {
    console.error('Error syncing user:', error);
    return sendError(res, 'Failed to sync user', 500);
  }
};

/**
 * Get user profile
 */
const getUserProfile = async (req, res) => {
  try {
    const { auth0Id } = req.params;

    if (!auth0Id) {
      return sendError(res, 'auth0Id is required', 400);
    }

    const user = await User.findByAuth0Id(auth0Id);

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    return sendSuccess(res, {
      id: user._id,
      auth0Id: user.auth0Id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      role: user.role,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return sendError(res, 'Failed to fetch user profile', 500);
  }
};

/**
 * Update user role
 */
const updateUserRole = async (req, res) => {
  try {
    const { auth0Id } = req.params;
    const { role } = req.body;

    if (!auth0Id || !role) {
      return sendError(res, 'auth0Id and role are required', 400);
    }

    const validRoles = ['host', 'cohost', 'participant', 'guest'];
    if (!validRoles.includes(role)) {
      return sendError(res, 'Invalid role', 400);
    }

    await User.updateRole(auth0Id, role);

    return sendSuccess(res, {
      message: 'User role updated successfully',
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return sendError(res, 'Failed to update user role', 500);
  }
};

module.exports = {
  syncUser,
  getUserProfile,
  updateUserRole,
};
