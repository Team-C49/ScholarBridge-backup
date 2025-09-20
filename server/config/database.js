const { Pool } = require('pg');
require('dotenv').config();

let pool;
let users = []; // Fallback in-memory storage
let otpStore = new Map(); // Fallback in-memory OTP storage

const connectDB = async () => {
  try {
    // Try to connect to PostgreSQL/NeonDB first
    if (process.env.DATABASE_URL) {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
      });
      
      // Test connection
      const client = await pool.connect();
      console.log('Connected to PostgreSQL/NeonDB database');
      
      // Create tables if they don't exist
      await createTables(client);
      client.release();
      
      return Promise.resolve();
    } else {
      // Fallback to in-memory storage
      console.log('No DATABASE_URL found, using in-memory database');
      return Promise.resolve();
    }
  } catch (error) {
    console.error('Database connection error:', error);
    console.log('Falling back to in-memory database');
    return Promise.resolve();
  }
};

const createTables = async (client) => {
  try {
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create OTP table
    await client.query(`
      CREATE TABLE IF NOT EXISTS otp_store (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp VARCHAR(10) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Database tables created/verified successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
};

const addUser = async (userData) => {
  if (pool) {
    try {
      const query = `
        INSERT INTO users (email, password, name, is_verified)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const values = [userData.email, userData.password, userData.name, userData.is_verified || false];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error adding user to database:', error);
      throw error;
    }
  } else {
    // Fallback to in-memory
    const user = {
      id: Date.now().toString(),
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    users.push(user);
    return user;
  }
};

const findUserByEmail = async (email) => {
  if (pool) {
    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      const result = await pool.query(query, [email]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  } else {
    // Fallback to in-memory
    return users.find(user => user.email === email);
  }
};

const findUserById = async (id) => {
  if (pool) {
    try {
      const query = 'SELECT * FROM users WHERE id = $1';
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  } else {
    // Fallback to in-memory
    return users.find(user => user.id === id);
  }
};

const updateUser = async (id, updateData) => {
  if (pool) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;
      
      for (const [key, value] of Object.entries(updateData)) {
        if (key !== 'id') {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      }
      
      if (fields.length === 0) return null;
      
      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);
      
      const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  } else {
    // Fallback to in-memory
    const userIndex = users.findIndex(user => user.id === id);
    if (userIndex !== -1) {
      users[userIndex] = {
        ...users[userIndex],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      return users[userIndex];
    }
    return null;
  }
};

const storeOTP = async (email, otp, expiresAt) => {
  if (pool) {
    try {
      // Delete existing OTP for this email
      await pool.query('DELETE FROM otp_store WHERE email = $1', [email]);
      
      // Insert new OTP
      const query = 'INSERT INTO otp_store (email, otp, expires_at) VALUES ($1, $2, $3)';
      await pool.query(query, [email, otp, expiresAt]);
    } catch (error) {
      console.error('Error storing OTP:', error);
      throw error;
    }
  } else {
    // Fallback to in-memory
    otpStore.set(email, { otp, expiresAt });
  }
};

const getOTP = async (email) => {
  if (pool) {
    try {
      const query = 'SELECT * FROM otp_store WHERE email = $1 ORDER BY created_at DESC LIMIT 1';
      const result = await pool.query(query, [email]);
      const row = result.rows[0];
      
      if (row) {
        return {
          otp: row.otp,
          expiresAt: row.expires_at
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting OTP:', error);
      throw error;
    }
  } else {
    // Fallback to in-memory
    return otpStore.get(email);
  }
};

const deleteOTP = async (email) => {
  if (pool) {
    try {
      await pool.query('DELETE FROM otp_store WHERE email = $1', [email]);
    } catch (error) {
      console.error('Error deleting OTP:', error);
      throw error;
    }
  } else {
    // Fallback to in-memory
    otpStore.delete(email);
  }
};

const getAllUsers = async () => {
  if (pool) {
    try {
      const query = 'SELECT * FROM users ORDER BY created_at DESC';
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  } else {
    // Fallback to in-memory
    return users;
  }
};

module.exports = {
  connectDB,
  addUser,
  findUserByEmail,
  findUserById,
  updateUser,
  storeOTP,
  getOTP,
  deleteOTP,
  getAllUsers
};
