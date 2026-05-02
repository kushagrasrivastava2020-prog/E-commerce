const db = require('../config/db');
const bcrypt = require('bcryptjs');

const UserModel = {
  async create({ email, password, first_name, last_name, role = 'user', phone }) {
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await db.query(
      `INSERT INTO ecommerce.users (email, password_hash, first_name, last_name, role, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, first_name, last_name, role, phone, is_active, created_at`,
      [email, password_hash, first_name, last_name, role, phone]
    );
    return result.rows[0];
  },

  async findByEmail(email) {
    const result = await db.query(
      'SELECT * FROM ecommerce.users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await db.query(
      `SELECT id, email, first_name, last_name, role, phone, avatar_url, 
              is_active, email_verified, created_at, updated_at 
       FROM ecommerce.users WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  },

  async comparePassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  },

  async updateProfile(id, { first_name, last_name, phone, avatar_url }) {
    const result = await db.query(
      `UPDATE ecommerce.users 
       SET first_name = COALESCE($2, first_name),
           last_name = COALESCE($3, last_name),
           phone = COALESCE($4, phone),
           avatar_url = COALESCE($5, avatar_url)
       WHERE id = $1
       RETURNING id, email, first_name, last_name, role, phone, avatar_url`,
      [id, first_name, last_name, phone, avatar_url]
    );
    return result.rows[0];
  },

  async updatePassword(id, newPassword) {
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(newPassword, salt);

    await db.query(
      'UPDATE ecommerce.users SET password_hash = $2 WHERE id = $1',
      [id, password_hash]
    );
  },

  async findAll(page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const countResult = await db.query('SELECT COUNT(*) FROM ecommerce.users');
    const total = parseInt(countResult.rows[0].count);

    const result = await db.query(
      `SELECT id, email, first_name, last_name, role, phone, is_active, created_at
       FROM ecommerce.users
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return { users: result.rows, total };
  },

  async updateRole(id, role) {
    const result = await db.query(
      `UPDATE ecommerce.users SET role = $2 WHERE id = $1
       RETURNING id, email, first_name, last_name, role`,
      [id, role]
    );
    return result.rows[0];
  },

  async toggleActive(id, is_active) {
    const result = await db.query(
      `UPDATE ecommerce.users SET is_active = $2 WHERE id = $1
       RETURNING id, email, first_name, last_name, role, is_active`,
      [id, is_active]
    );
    return result.rows[0];
  },
};

module.exports = UserModel;