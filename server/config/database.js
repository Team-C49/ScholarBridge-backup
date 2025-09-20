// In-memory database for demo purposes
// In production, replace with actual database (MongoDB, PostgreSQL, etc.)

let users = [];
let otpStore = new Map();

const connectDB = async () => {
  console.log('Connected to in-memory database');
  return Promise.resolve();
};

const addUser = (userData) => {
  const user = {
    id: Date.now().toString(),
    ...userData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  users.push(user);
  return user;
};

const findUserByEmail = (email) => {
  return users.find(user => user.email === email);
};

const findUserById = (id) => {
  return users.find(user => user.id === id);
};

const updateUser = (id, updateData) => {
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
};

const storeOTP = (email, otp, expiresAt) => {
  otpStore.set(email, { otp, expiresAt });
};

const getOTP = (email) => {
  return otpStore.get(email);
};

const deleteOTP = (email) => {
  otpStore.delete(email);
};

const getAllUsers = () => {
  return users;
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
