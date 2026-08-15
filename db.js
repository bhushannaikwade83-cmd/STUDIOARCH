import mysql from 'mysql2/promise.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'digitrix_studioarchwebsite',
  password: process.env.DB_PASSWORD || 'studioarch@70',
  database: process.env.DB_NAME || 'digitrix_studioarchwebsite',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

console.log('🗄️ [Database] MySQL connection pool initialized');
console.log('📍 [Database] Host:', process.env.DB_HOST || 'localhost');
console.log('📍 [Database] Database:', process.env.DB_NAME || 'digitrix_studioarchwebsite');

export async function query(sql, values = []) {
  try {
    const connection = await pool.getConnection();
    const [results] = await connection.execute(sql, values);
    connection.release();
    return results;
  } catch (error) {
    console.error('❌ [Database] Query error:', {
      sql,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

export async function getProjects() {
  console.log('📥 [Database] Fetching projects...');
  const projects = await query('SELECT * FROM projects ORDER BY display_order ASC');
  console.log('✅ [Database] Fetched', projects.length, 'projects');
  return projects;
}

export async function createProject(data) {
  console.log('📝 [Database] Creating project:', data.name);
  const sql = 'INSERT INTO projects (name, location, year, category, description, images) VALUES (?, ?, ?, ?, ?, ?)';
  const result = await query(sql, [
    data.name,
    data.location,
    data.year,
    data.category,
    data.description,
    JSON.stringify(data.images || [])
  ]);
  console.log('✅ [Database] Project created with ID:', result.insertId);
  return { id: result.insertId, ...data };
}

export async function updateProject(id, data) {
  console.log('✏️ [Database] Updating project:', id);
  const sql = 'UPDATE projects SET name=?, location=?, year=?, category=?, description=? WHERE id=?';
  await query(sql, [
    data.name,
    data.location,
    data.year,
    data.category,
    data.description,
    id
  ]);
  console.log('✅ [Database] Project updated');
}

export async function deleteProject(id) {
  console.log('🗑️ [Database] Deleting project:', id);
  const sql = 'DELETE FROM projects WHERE id=?';
  await query(sql, [id]);
  console.log('✅ [Database] Project deleted');
}

export async function getEventVideos() {
  console.log('📥 [Database] Fetching event videos...');
  const videos = await query('SELECT * FROM event_videos ORDER BY display_order ASC');
  console.log('✅ [Database] Fetched', videos.length, 'videos');
  return videos;
}

export async function createEventVideo(data) {
  console.log('📝 [Database] Creating event video:', data.title);
  const sql = 'INSERT INTO event_videos (title, youtube_id, url) VALUES (?, ?, ?)';
  const result = await query(sql, [data.title, data.youtube_id, data.url]);
  console.log('✅ [Database] Video created with ID:', result.insertId);
  return { id: result.insertId, ...data };
}

export async function deleteEventVideo(id) {
  console.log('🗑️ [Database] Deleting event video:', id);
  const sql = 'DELETE FROM event_videos WHERE id=?';
  await query(sql, [id]);
  console.log('✅ [Database] Video deleted');
}

export async function getJournalPosts() {
  console.log('📥 [Database] Fetching journal posts...');
  const posts = await query('SELECT * FROM journal_posts ORDER BY created_at DESC');
  console.log('✅ [Database] Fetched', posts.length, 'posts');
  return posts;
}

export async function createJournalPost(data) {
  console.log('📝 [Database] Creating journal post:', data.title);
  const sql = 'INSERT INTO journal_posts (title, date, excerpt, category) VALUES (?, ?, ?, ?)';
  const result = await query(sql, [data.title, data.date, data.excerpt, data.category]);
  console.log('✅ [Database] Post created with ID:', result.insertId);
  return { id: result.insertId, ...data };
}

export async function deleteJournalPost(id) {
  console.log('🗑️ [Database] Deleting journal post:', id);
  const sql = 'DELETE FROM journal_posts WHERE id=?';
  await query(sql, [id]);
  console.log('✅ [Database] Post deleted');
}

export async function getContactMessages() {
  console.log('📥 [Database] Fetching contact messages...');
  const messages = await query('SELECT * FROM contact_messages ORDER BY created_at DESC');
  console.log('✅ [Database] Fetched', messages.length, 'messages');
  return messages;
}

export async function createContactMessage(data) {
  console.log('📝 [Database] Creating contact message from:', data.email);
  const sql = 'INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)';
  const result = await query(sql, [data.name, data.email, data.message]);
  console.log('✅ [Database] Message created with ID:', result.insertId);
  return { id: result.insertId, ...data };
}

export async function deleteContactMessage(id) {
  console.log('🗑️ [Database] Deleting contact message:', id);
  const sql = 'DELETE FROM contact_messages WHERE id=?';
  await query(sql, [id]);
  console.log('✅ [Database] Message deleted');
}

// Authentication
export async function loginUser(email, password) {
  console.log('🔐 [Auth] Login attempt:', email);
  const sql = 'SELECT * FROM users WHERE email=?';
  const results = await query(sql, [email]);

  if (results.length === 0) {
    console.error('❌ [Auth] User not found:', email);
    throw new Error('Invalid email or password');
  }

  const user = results[0];
  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    console.error('❌ [Auth] Password mismatch for:', email);
    throw new Error('Invalid email or password');
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '24h' }
  );

  console.log('✅ [Auth] Login successful:', email);
  return { token, user: { id: user.id, email: user.email, role: user.role } };
}

export function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    return decoded;
  } catch (error) {
    console.error('❌ [Auth] Token verification failed:', error.message);
    return null;
  }
}
