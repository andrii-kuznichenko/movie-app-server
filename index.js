const express = require('express');
const app = express();
require('dotenv/config');
const cors = require('cors');
const PORT = process.env.PORT || 8000;
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.ELEPHANT_SQL_CONNECTION_STRING });
app.use(express.json());
app.use(cors())

app.get('/', (req, res) => {
  res.send('hello world');
});

app.get('/api/movies', (req, res) => {
  pool
    .query('SELECT * FROM movies;')
    .then(data => {
      res.json(data.rows);
    })
    .catch(e => res.status(500).json({ message: e.message }));
});
app.get('/api/movies/:id', (req, res) => {
  const id = req.params.id;
  pool
    .query('SELECT * FROM movies WHERE id=$1;', [id])
    .then(data => {
      if (data.rowCount === 0) {
        res.status(404).json({ message: `movies with id ${id} not found!` });
      } else {
        res.json(data.rows[0]);
      }
    })
    .catch(e => res.status(500).json({ message: e.message }));
});
app.post('/api/movies', (req, res) => {
  const { title, director, year, rating, poster } = req.body;
  pool
    .query('INSERT INTO movies (title, director, year, rating, poster) VALUES ($1,$2,$3,$4,$5) RETURNING *;', [
      title,
      director,
      year,
      rating,
      poster
    ])
    .then(data => {
      res.status(201).json(data.rows[0]);
    })
    .catch(e => res.status(500).json({ message: e.message }));
});
app.put('/api/movies/:id', (req, res) => {
  const id = req.params.id;
  const { title, director, year, rating, poster } = req.body;
  pool
    .query('UPDATE movies  SET title=$1,director=$2,year=$3,rating=$4,poster=$5 WHERE id=$6 RETURNING *;', [
      title,
      director,
      year,
      rating,
      poster,
      id
    ])
    .then(data => {
      res.json(data.rows[0]);
    })
    .catch(e => res.status(500).json({ message: e.message }));
});
app.delete('/api/movies/:id', (req, res) => {
  const id = req.params.id;
  pool
    .query('DELETE FROM movies WHERE id=$1 RETURNING *', [id])
    .then(data => {
      if (data.rowCount === 0) {
        res.status(404).json({ message: `movie with id ${id} not found!` });
      } else {
        res.json(data.rows[0]);
      }
    })
    .catch(e => res.status(500).json({ message: e.message }));
});





app.listen(PORT, () => {
  console.log('server is running!!');
});