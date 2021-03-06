const cors = require('cors');
const express = require('express');
const recipes = require('./recipes');
const bodyParser = require('body-parser');
const RateLimit = require('express-rate-limit');

const app = express();

app.enable('trust proxy');

app.use(cors('*'));

const limiter = new RateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100,
  delayMs: 0,
});

app.use(limiter);
app.use(bodyParser.json());

const parseFields = (fields) => fields.split(',').map(field => field.trim());

app.get('/recipes', (req, res) => {
  let { page, limit, fields } = req.query;

  page = parseInt(page) || 1;
  limit = parseInt(limit) || 9;

  fields = fields ? parseFields(fields) : undefined;

  let paginatedRecipes;

  try {
    paginatedRecipes = recipes.paginateRecipes({ page, limit, fields });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }

  return res.json(paginatedRecipes);
});

app.get('/recipes/:id', (req, res) => {
  try {
    const fields = (req.query.fields === undefined) ? undefined : parseFields(req.query.fields);
    const recipe = recipes.findRecipe(parseInt(req.params.id));

    return res.json(recipes.fieldsResolver(recipe, fields));
  } catch (err) {
    return res.status(404).json({ message: err.message });
  }
});

app.post('/recipes/:id/likes', (req, res, next) => {
  const recipeId = parseInt(req.params.id);

  try {
    return res.json(recipes.bumpRecipeLike(recipeId));
  } catch (err) {
    return res.status(404).json({ message: err.message });
  }
});

app.post('/recipes/:id/comments', (req, res, next) => {
  const { text } = req.body;
  const recipeId = parseInt(req.params.id);

  if (text.length < 4) {
    return res.status(422).json({ message: `'text' field should be at least 4 character` });
  }

  try {
    return res.json(recipes.addComment(recipeId, text));
  } catch (err) {
    return res.status(404).json({ message: err.message });
  }
});

app.get('*', (req, res) => {
  res.status(404).send('Endpoint Not found');
});

module.exports = app;
