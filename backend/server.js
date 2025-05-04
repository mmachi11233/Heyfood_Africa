const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'heyfood_clone',
  password: 'beautyray16',
  port: 5432,
});

pool.connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch(err => console.error('Error connecting to PostgreSQL:', err));

app.get('/test', (req, res) => {
  console.log('Received request on /test');
  res.json({ message: 'Test endpoint works!' });
});

// Route for fetching restaurants
app.get('/api/restaurants', async (req, res) => {
  const { search, tags, sort } = req.query;
  let query = 'SELECT * FROM restaurants';
  const values = [];
  const conditions = [];
  let orderByClause = '';

  console.log('Received request with parameters:', { search, tags, sort });

  // Adding search
  if (search) {
    conditions.push('(name ILIKE $1 OR cuisine ILIKE $1 OR tags::TEXT ILIKE $1)');
    values.push(`%${search}%`);
  }


  if (tags) {
    const tagList = tags.split(',').map(tag => tag.trim().toLowerCase()); // Convert to lowercase


    const tagConditions = tagList.map((tag, index) => `LOWER(tags) LIKE $${values.length + index + 1}`);
    conditions.push(`(${tagConditions.join(' OR ')})`); // Combine conditions with OR

    values.push(...tagList.map(tag => `%"${tag}"%`)); // Add LIKE patterns to values
  }
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  // Sorting
  if (sort) {
    let sortColumn = '';
    let sortDirection = 'ASC';

    switch (sort) {
      case 'highest_rated':
        sortColumn = 'rating';
        sortDirection = 'DESC';
        break;
      case 'newest':
        sortColumn = 'created_at';
        sortDirection = 'DESC';
        break;
      case 'most_rated':
        sortColumn = 'rating_count';
        sortDirection = 'DESC';
        break;
      case 'most_popular':
        sortColumn = 'popularity_score';
        sortDirection = 'DESC';
        break;
      case 'tags':
        orderByClause = 'ORDER BY tags[1]'; // Sort by the first tag alphabetically
        break;
      default:
        break;
    }

    if (sortColumn && sort !== 'tags') {
      orderByClause = `ORDER BY ${sortColumn} ${sortDirection}`;
    }
  }

  query += ` ${orderByClause}`;
  console.log('Constructed SQL Query:', query);
  console.log('Query Values:', values);

  try {
    // Run the query with the constructed conditions
    const result = await pool.query(query, values);
    console.log('Query Result:', result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching restaurants:', error.message);
    console.error(error.stack);
    res.status(500).json({ error: 'Failed to fetch restaurants' });
  }
});


app.get('/api/tags', async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT unnest(tags) AS tag FROM restaurants ORDER BY tag');
    const tags = result.rows.map(row => row.tag);
    res.json(tags);
  } catch (err) {
    console.error('Error fetching tags:', err);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
