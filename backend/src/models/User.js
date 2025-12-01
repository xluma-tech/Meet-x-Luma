const { getDatabase } = require('../config/database');
const { ObjectId } = require('mongodb');

class User {
  static get collection() {
    return getDatabase().collection('users');
  }

  static async findByAuth0Id(auth0Id) {
    return await this.collection.findOne({ auth0Id });
  }

  static async findById(id) {
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  static async findByEmail(email) {
    return await this.collection.findOne({ email });
  }

  static async create(userData) {
    const user = {
      auth0Id: userData.auth0Id,
      email: userData.email,
      name: userData.name,
      picture: userData.picture,
      role: userData.role || 'participant',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.collection.insertOne(user);
    return { ...user, _id: result.insertedId };
  }

  static async updateLastLogin(auth0Id) {
    return await this.collection.updateOne(
      { auth0Id },
      { $set: { updatedAt: new Date() } }
    );
  }

  static async updateRole(auth0Id, role) {
    return await this.collection.updateOne(
      { auth0Id },
      { $set: { role, updatedAt: new Date() } }
    );
  }

  static async findAll(filter = {}, options = {}) {
    return await this.collection.find(filter, options).toArray();
  }
}

module.exports = User;
