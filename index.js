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

//get all movies in random order
app.get('/api/movies', (req, res) => {
  pool
    .query('SELECT id, title, year, description, rating, likes, dislikes, age_rating, poster, big_poster FROM movies ORDER BY RANDOM() ;')
    .then(data => {
     res.status(201).json(data.rows);
    })
    .catch(e => res.status(500).json({ message: e.message }));
});

//get all popular movies sorted by likes
app.get('/api/movies/popular', (req, res) => {
  pool
    .query('SELECT id, title, year, rating, description, likes, dislikes, age_rating, poster, big_poster FROM movies ORDER BY likes DESC;')
    .then(data => {
     res.status(201).json(data.rows);
    })
    .catch(e => res.status(500).json({ message: e.message }));
});

//get all recommended movies sorted by IMDB rating
app.get('/api/movies/recommended', (req, res) => {
  pool
    .query('SELECT id, title, year, rating, likes, description, dislikes, age_rating, poster, big_poster FROM movies ORDER BY rating DESC ;')
    .then(data => {
     res.status(201).json(data.rows);
    })
    .catch(e => res.status(500).json({ message: e.message }));
});


// get full movie info by id
app.get('/api/movie/:id', (req, res) => {
  const id = req.params.id;
  pool
    .query('SELECT * FROM movies WHERE id=$1;', [id])
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
          .query("SELECT  id, first_name, second_name, DATE_PART('YEAR', AGE(CURRENT_DATE, date_of_birth)) AS date_of_birth, photo FROM  artists WHERE id=$1", 
          [oneMovie.director_id])
          .then(director => {
            const movieDirector = {...oneMovie, "director": director.rows[0]};
            pool
            .query("SELECT id, first_name, second_name, DATE_PART('YEAR', AGE(CURRENT_DATE, date_of_birth)) AS date_of_birth, photo FROM artists JOIN movies_actors ON artists.id = movies_actors.artist_id WHERE movies_actors.movie_id=$1;",
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

//get all genres
app.get('/api/genres', (req, res) => {
  pool
  .query('SELECT * FROM genre')
  .then(data => {
    res.json(data.rows);
  })
  .catch(e => res.status(404).json({ message: e.message }));
})

//get movies by genre
app.get('/api/movies/genre/:id', (req, res) => {
  const id = req.params.id;
  pool
    .query('SELECT id, title, length_minutes, description, year, rating, likes, dislikes, age_rating, poster, big_poster FROM movies JOIN movies_genre ON movies.id = movies_genre.movies_id WHERE movies_genre.genre_id=$1;',
     [id])
    .then(data => {
      if (data.rowCount === 0) {
        res.status(404).json({ message: `There is no movies with such genre` });
      } else {
        res.json(data.rows);
      }
    })
    .catch(e => res.status(500).json({ message: e.message }));
})


//get all artists
app.get('/api/artists', (req, res) => {
  pool
  .query("SELECT  id, first_name, second_name, DATE_PART('YEAR', AGE(CURRENT_DATE, date_of_birth)) AS date_of_birth, photo FROM  artists")
  .then(data => {
    res.json(data.rows);
  })
  .catch(e => res.status(404).json({ message: e.message }));
})

//get artist by id
app.get('/api/artist/:id', (req, res) => {
  const id = req.params.id;
  pool
  .query("SELECT  id, first_name, second_name, DATE_PART('YEAR', AGE(CURRENT_DATE, date_of_birth)) AS date_of_birth, photo FROM  artists WHERE id=$1", [id])
  .then(data => {
    res.json(data.rows);
  })
  .catch(e => res.status(404).json({ message: e.message }));
})

//get artist's movie by artist id
app.get('/api/movies/artist/:id', (req, res) => {
  const id = req.params.id;
  pool
    .query('SELECT id, title, length_minutes, year,description,  rating, likes, dislikes, age_rating, poster, big_poster FROM movies JOIN movies_actors ON movies.id = movies_actors.movie_id WHERE movies_actors.artist_id=$1;',
     [id])
    .then(actors => {
      let moviesByArtist = {"as_starring_actor":actors.rows};
      pool
      .query('SELECT id, title, length_minutes, year, rating, likes, dislikes, age_rating, poster, big_poster FROM movies WHERE director_id=$1;',[id])
      .then(director => {
        moviesByArtist = {...moviesByArtist, "as_director":director.rows}
        res.json(moviesByArtist);
      })
      .catch(e => res.status(500).json({ message: e.message }));
    })
    .catch(e => res.status(500).json({ message: e.message }));
})

//get comments by movie id
app.get('/api/movies/comments/:id', (req, res) => {
  const id = req.params.id;
  pool
    .query('SELECT id, author, content, (CURRENT_DATE - publish_date) AS publish_date, likes, dislikes FROM comments JOIN movies_comments ON comments.id =  movies_comments.comment_id WHERE movies_comments.movie_id=$1;',
     [id])
    .then(comments => {
      res.json(comments.rows);
     if(comments.rowCount === 0){
      res.status(500).send('There is no comments for this movie');
     } 
    })
    .catch(e => res.status(500).json({ message: e.message }));
})

// post new movie with director, genres and starring actors


// "title": "Saltburn",
//"length_minutes": 116,
// "year": 2023,
// "rating": 7.2,
// "likes": 0,
// "dislikes": 0,
// "age_rating": 18,
// "poster": "https://en.wikipedia.org/wiki/Saltburn_(film)#/media/File:Saltburn_Film_Poster.jpg",
// "big_poster": "https://assets.glamour.de/photos/64f07e1e73d8634c9e0e59d8/16:9/w_1600,c_limit/310823-saltburn-stars-aufm.jpg",
// "genres": [1,2],
// "director": 1
// "starring_actors": [1,2,3,4]

app.post('/api/movies', async (req, res) => {
  const { title, length_minutes, year, rating, description, age_rating, poster, big_poster, genres, director, starring_actors} = req.body;
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const queryText = 'INSERT INTO movies (title,length_minutes, year, rating, likes, dislikes, age_rating, poster, big_poster, director_id, description) VALUES ($1,$8,$2,$3,0,0,$4,$5,$6,$7,$8) RETURNING *;'
    const movie = await client.query(queryText,  [
          title,
          year,
          rating,
          age_rating,
          poster,
          big_poster,
          director,
          length_minutes,
          description
        ])
        
    for(const genre of genres){
     await client.query('INSERT INTO movies_genre(genre_id, movies_id) VALUES ($1,$2) RETURNING *', [genre, movie.rows[0].id])
    }
    for(const actor of starring_actors){
      await client.query('INSERT INTO movies_actors(artist_id, movie_id) VALUES ($1,$2) RETURNING *' , [actor, movie.rows[0].id])
    }
    await client.query('COMMIT')
    res.send('Succesfully!');
  } catch (e) {
    await client.query('ROLLBACK')
    res.status(500).json({ message: e.message });
  } finally {
    client.release()
  }
});

//add new artist

// {
//   "first_name": "Emerald",
//   "second_name": "Fennell",
//   "date_of_birth": "1985-09-30T23:00:00.000Z",
//   "photo": "https://en.wikipedia.org/wiki/Emerald_Fennell#/media/File:Emerald_Fennell25-03-2013_MarkJones_(cropped).jpg"
// }
app.post('/api/artists', (req, res) => {
  const {first_name, second_name, date_of_birth, photo} = req.body;
  pool
  .query('INSERT INTO artists (first_name, second_name, date_of_birth, photo) VALUES ($1,$2,$3,$4) RETURNING *;', [
    first_name, 
    second_name, 
    date_of_birth, 
    photo])
  .then(artist => {
    res.json(artist.rows[0]);
  })
  .catch(e => res.status(500).json({ message: e.message }));  
})

//add new comments to movie
// {
// "author": "Mrtgf",
// "content": "Saltburn is another example for how to multimillion dollar movie production can be garbage in the hands of amateur screenwriter&director. I feel lucky I haven’t seen in the theater So I saved 16$ For this meaningless ceremony.",
// "publish_date": "2024-01-04T23:00:00.000Z",
// "movie_id": 1
// }

app.post('/api/comments', (req, res) => {
  const {author, content, publish_date, movie_id} = req.body;
  pool
  .query('INSERT INTO comments (author, content, publish_date, likes, dislikes) VALUES ($1,$2,$3,0,0) RETURNING *;', [
    author, 
    content, 
    publish_date])
  .then(comment => {
    pool
    .query('INSERT INTO movies_comments (comment_id, movie_id) VALUES ($1,$2) RETURNING *;',[comment.rows[0].id, movie_id])
    .then(movieData => {
      res.json(comment.rows[0]);
    })
    .catch(e => res.status(500).json({ message: e.message }));  
  })
  .catch(e => res.status(500).json({ message: e.message }));  
})

//update movie info

// "title": "Saltburn",
// "length_minutes": 113
// "year": 2023,
// "rating": 7.2,
// "description": "afdasdfasdasd",
// "likes": 0,
// "dislikes": 0,
// "age_rating": 18,
// "poster": "https://en.wikipedia.org/wiki/Saltburn_(film)#/media/File:Saltburn_Film_Poster.jpg",
// "big_poster": "https://assets.glamour.de/photos/64f07e1e73d8634c9e0e59d8/16:9/w_1600,c_limit/310823-saltburn-stars-aufm.jpg",
// "genres": [1,2],
// "director": 1
// "starring_actors": [1,2,3,4]

app.put('/api/movie/:id', async (req, res) => {
  const { title,length_minutes, year, rating, description, age_rating, poster, big_poster, genres, director, starring_actors} = req.body;
  const id = req.params.id;
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const queryText = 'UPDATE movies SET title=$1,length_minutes=$9, year=$2,rating=$3,age_rating=$4,poster=$5,big_poster=$6,director_id=$7, description=$10 WHERE id=$8 RETURNING *;'
    await client.query(queryText,  [
          title,
          year,
          rating,
          age_rating,
          poster,
          big_poster,
          director,
          id,
          length_minutes,
          description
        ])
    await client.query('DELETE FROM movies_genre WHERE movies_id=$1', [id]);
    for(const genre of genres){
      await client.query('INSERT INTO movies_genre(genre_id, movies_id) VALUES ($1,$2)', [genre, id])
    }
    await client.query('DELETE FROM movies_actors WHERE movie_id=$1', [id]);
    for(const actor of starring_actors){
      await client.query('INSERT INTO movies_actors(artist_id, movie_id) VALUES ($1,$2) RETURNING *' , [actor, id])
    }
    await client.query('COMMIT')
    res.send('Succesfully updated!');
  } catch (e) {
    await client.query('ROLLBACK')
    res.status(500).json({ message: e.message });
  } finally {
    client.release()
  }
});
//update artist

// {
//   "first_name": "Emerald",
//   "second_name": "Fennell",
//   "date_of_birth": "1985-09-30",
//   "photo": "https://en.wikipedia.org/wiki/Emerald_Fennell#/media/File:Emerald_Fennell25-03-2013_MarkJones_(cropped).jpg"
// }

app.put('/api/artist/:id', (req, res) => {
  const id = req.params.id;
  const { first_name, second_name, date_of_birth, photo} = req.body;

  pool
  .query('UPDATE artists SET first_name=$1, second_name=$2, date_of_birth=$3, photo=$4 WHERE id=$5 RETURNING *' ,[
    first_name,
    second_name,
    date_of_birth,
    photo,
    id
  ])
  .then(artist => {
    res.status(201).json(artist.rows[0]);
  })
  .catch(e => res.status(500).json({ message: e.message }));  
})
//put like to movie
app.patch("/api/movie/like/:id", (req, res) => {
  const id = req.params.id;
  pool
  .query('SELECT * FROM movies WHERE id=$1', [id])
  .then(movie => {
    const like = movie.rows[0].likes + 1;
    pool
    .query('UPDATE movies SET likes=$1 WHERE id=$2 RETURNING *',[like, id])
    .then(comment => {
      res.status(201).json(comment.rows[0])
    })
    .catch(e => res.status(500).json({ message: e.message }));   
  })
  .catch(e => res.status(500).json({ message: e.message }));  
})
//put dislike to movie
app.patch("/api/movie/dislike/:id", (req, res) => {
  const id = req.params.id;
  pool
  .query('SELECT * FROM movies WHERE id=$1', [id])
  .then(movie => {
    const dislike = movie.rows[0].dislikes + 1;
    pool
    .query('UPDATE movies SET dislikes=$1 WHERE id=$2 RETURNING *',[dislike, id])
    .then(comment => {
      res.status(201).json(comment.rows[0])
    })
    .catch(e => res.status(500).json({ message: e.message }));   
  })
  .catch(e => res.status(500).json({ message: e.message }));  
})
//put like to comment
app.patch("/api/comment/like/:id", (req, res) => {
  const id = req.params.id;
  pool
  .query('SELECT * FROM comments WHERE id=$1', [id])
  .then(commentData => {
    const like = commentData.rows[0].likes + 1;
    pool
    .query('UPDATE comments SET likes=$1 WHERE id=$2 RETURNING *',[like, id])
    .then(comment => {
      res.status(201).json(comment.rows[0])
    })
    .catch(e => res.status(500).json({ message: e.message }));   
  })
  .catch(e => res.status(500).json({ message: e.message }));  
})
//put dislike to comment
app.patch("/api/comment/dislike/:id", (req, res) => {
  const id = req.params.id;
  pool
  .query('SELECT * FROM comments WHERE id=$1', [id])
  .then(commentData=> {
    const dislike = commentData.rows[0].dislikes + 1;
    pool
    .query('UPDATE comments SET dislikes=$1 WHERE id=$2 RETURNING *',[dislike, id])
    .then(comment => {
      res.status(201).json(comment.rows[0])
    })
    .catch(e => res.status(500).json({ message: e.message }));   
  })
  .catch(e => res.status(500).json({ message: e.message }));  
})
// delete movie
app.delete('/api/movie/:id', async (req, res) => {
  const id = req.params.id;
  
  const client = await pool.connect()
  try {

    await client.query('BEGIN')

    await client.query('DELETE FROM movies_genre WHERE movies_id=$1', [id]);
    await client.query('DELETE FROM movies_actors WHERE movie_id=$1', [id]);
    await client.query('DELETE FROM movies_comments WHERE movie_id=$1', [id]);
    await client.query('DELETE FROM movies WHERE id=$1;',  [id])

    await client.query('COMMIT')
    res.send('Succesfully deleted!');
  } catch (e) {
    await client.query('ROLLBACK')
    res.status(500).json({ message: e.message });
  } finally {
    client.release()
  }
});

// delete artist (only if all his/her movies was deleted)
app.delete('/api/artist/:id', (req, res) => {
  const id = req.params.id;
  pool
  .query('SELECT * FROM movies WHERE director_id=$1', [id])
  .then(director => {
    if(director.rowCount === 0){
      pool
      .query('DELETE FROM artists WHERE id=$1 RETURNING *', [id])
      .then(artist => {
        if (artist.rowCount === 0) {
          res.status(404).json({ message: `artist with id ${id} not found!` });
        } else {
          res.json(artist.rows[0]);
        }
      })
      .catch(e => res.status(500).json({ message: e.message }));
      } else {
        res.status(404).send(`Artists with this id ${id} is a director for this movie ${director.rows[0].title}`)
      }
  })
  .catch(e => res.status(500).json({ message: e.message }));
});

// delete comment
// app.delete('/api/comment/:id', (req, res) => {
//   const id = req.params.id;
//   pool
//     .query('DELETE FROM comments WHERE id=$1 RETURNING *', [id])
//     .then(data => {
//       if (data.rowCount === 0) {
//         res.status(404).json({ message: `movie with id ${id} not found!` });
//       } else {
//         res.json(data.rows[0]);
//       }
//     })
//     .catch(e => res.status(500).json({ message: e.message }));
// });



app.listen(PORT, () => {
  console.log('server is running!!');
});