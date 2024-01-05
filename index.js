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
  res.send('backend is working');
});

//get all movies in random movies
app.get('/api/movies', (req, res) => {
  let allMovies;
  pool
    .query('SELECT id, title, year, rating, likes, dislikes, age_rating, poster, big_poster FROM movies ORDER BY RANDOM() ;')
    .then(data => {
     res.status(201).json(data.rows);
    })
    .catch(e => res.status(500).json({ message: e.message }));
});


// get movie and its genre by id
app.get('/api/movies/:id', (req, res) => {
  const id = req.params.id;
  pool
    .query('SELECT id, title, year, rating, likes, dislikes, age_rating, poster, big_poster FROM movies WHERE id=$1;', [id])
    .then(data => {
      if (data.rowCount === 0) {
        res.status(404).json({ message: `movies with id ${id} not found!` });
      } else {
        pool
        .query('SELECT title FROM genre JOIN movies_genre ON genre.id = movies_genre.genre_id WHERE movies_genre.movies_id=$1;', 
        [id])
        .then(genres => {
          const newGenres = genres.rows.map(genre => {
            return genre.title;
          })
          const oneMovie = {...data.rows[0], "genres": newGenres};
          pool
          .query('SELECT * FROM artists WHERE id=$1', [oneMovie.id])
          .then(director => {
            const movieDirector = {...oneMovie, "director": director.rows[0]};
            pool
            .query('SELECT id, first_name, second_name, date_of_birth, photo FROM artists JOIN movies_actors ON artists.id = movies_actors.artist_id WHERE movies_actors.movie_id=$1;',
            [oneMovie.id])
            .then(actors => {
              const movieInfo = {...movieDirector, "starring_actors": actors.rows};
              res.status(201).json(movieInfo);
            })
          })
          .catch(e => res.status(500).json({ message: e.message }));
        })  
        .catch(e => res.status(500).json({ message: e.message }));
      }
    })
    .catch(e => res.status(500).json({ message: e.message }));
});

// //get director and starring actors by id
// app.get('/api/movies/:id', (req, res) => {
//   const id = req.params.id;
//   pool
//     .query('SELECT * FROM movies WHERE id=$1;', [id])
//     .then(data => {
//       if (data.rowCount === 0) {
//         res.status(404).json({ message: `movies with id ${id} not found!` });
//       } else {
//         pool
//         .query('SELECT * FROM artists WHERE id=$1', [data.row[0].director_id])
//         .then(director => {
//           const oneMovie = {"director": newGenres};
//           res.status(201).json(oneMovie);})
//         .catch(e => res.status(500).json({ message: e.message }));
//       }
//     })
//     .catch(e => res.status(500).json({ message: e.message }));
// });


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