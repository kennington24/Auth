const bodyParser = require('body-parser');
const express = require('express');
const session = require('express-session');
const User = require('./user.js');
const cors = require('cors');

const STATUS_USER_ERROR = 422;

const server = express();

server.use(bodyParser.json());
server.use(
  session({
    secret: 'e5SPiqsEtjexkTj3Xqovsjzq8ovjfgVDFMfUzSmJO21dtXs4re',
    saveUninitialized: false,
    resave: true,
    cookie: { maxAge: 1 * 24 * 60 * 60 * 1000 },
    secure: false,
    name: 'auth'
  })
);

const corsOptions = {
  origin: 'http://localhost:3000',
  credentials: true
};
server.use(cors(corsOptions));

const sendUserError = (err, res) => {
  res.status(STATUS_USER_ERROR);
  if (err && err.message) {
    res.json({ message: err.message, stack: err.stack });
  } else {
    res.json({ error: err });
  }
};

const requiresLogin = function (msg) {
  return function (req, res, next) {
    if (req.session && req.session.name) {
      next();
    } else {
      res.status(401).json({ msg });
    }
  };
};

// creates a new user
server.post('/users', (req, res) => {
  const { username, password } = req.body;
  const user = new User(req.body);
  if (!username || !password) {
    res
      .status(STATUS_USER_ERROR)
      .json({ error: 'Please provide username and password.' });
  } else {
    user
      .save()
      .then(savedUser => res.status(200).json(savedUser))
      .catch(err => sendUserError(err, res));
  }
});

// user login
server.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username && password) {
    User.findOne({ username })
      .then((user) => {
        user.isPassWordValid(password).then((response) => {
          if (response) {
            req.session.name = user.username;
            res.status(200).json({ success: true });
          } else {
            sendUserError({ message: 'Username and password are invalid.' });
          }
        });
      })
      .catch(err =>
        res.status(500).json({ errorMessage: 'There was an error logging in.' })
      );
  } else {
    sendUserError({ message: 'Please provide username and password.' }, res);
  }
});

// displays user log in db for logged in users
server.get('/me', (req, res) => {
  if (req.session.name) {
    User.find()
      .then((users) => {
        if (users) {
          res.status(200).json(users);
        }
      })
      .catch((err) => {
        res.status(500).json({ errorMessage: 'No users yet.' }, res);
      });
  } else {
    sendUserError({ message: 'Please log in to see information.' }, res);
  }
});

// greets current logged in user
server.get('/greet', (req, res) => {
  const { name } = req.session;
  res.send(`hello ${name}`);
});

// logs out users
server.get('/logout', (req, res, next) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        return next(err);
      }
      return res.redirect('/greet');
    });
  }
});

server.get(
  '/restricted/users',
  requiresLogin('please login to view page'),
  (req, res) => {
    res.send({ greeing: `Welcome back ${req.session.name}` });
  }
);

module.exports = { server };
