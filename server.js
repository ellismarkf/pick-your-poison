const express = require('express')
const { Client } = require('@elastic/elasticsearch')
const axios = require('axios')
const app = express()
const PORT = 3000
const client = new Client({ node: 'http://localhost:9200' })

app.use(express.json())
app.use(express.static('public'))

app.get('/indices', async (req, res) => {
  const { body } = await client.cat.indices({
    format: 'json'
  })
  res.send(body)
})

app.get('/libations', async (req, res) => {
  const { body } = await client.indices.get('libations')
  res.send(body)
})

app.put('/libations', async (req, res) => {
  const { body } = await client.indices.create({
    index: 'libations',
    body: {
      mappings: {
        properties: {
          ingredients: {
            type: 'nested'
          }
        }
      }
    }
  })
  res.send(body)
})

app.post('/libations', async (req, res) => {
  const { body } = await client.index({
    index: 'libations',
    body: req.body
  })
  res.send(body)
})

/**
 * 
 * @param {Object[]} ingredients 
 */
function getIngredientsByName(ingredients) {
  return {
    query: {
      nested: {
        path: 'ingredients',
        query: {
          bool: {
            should: ingredients.map(name => ({
              match: { 'ingredients.name': name }
            }))
          }
        }
      }
    }
  }
}

app.get('/search', async (req, res) => {
  const { ingredients } = req.query
  console.log(getIngredientsByName(ingredients.split(',')).query.nested.query.bool.should)
  const { body } = await client.search({
    index: 'libations',
    body: getIngredientsByName(ingredients.split(','))
  })
  console.log(body.hits.hits)
  res.send(body)
})

app.listen(PORT, () => console.log(`App listening on port ${PORT}`))