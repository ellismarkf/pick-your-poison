const express = require('express')
const { Client } = require('@elastic/elasticsearch')
const app = express()
const PORT = 3000
const client = new Client({ node: 'http://localhost:9200' })
const libations = 'libations'

app.use(express.json())
app.use(express.static('public'))

app.get('/indices', async (req, res) => {
  const { body } = await client.cat.indices({
    format: 'json'
  })
  res.send(body)
})

app.get('/indices/:name', async (req, res) => {
  const { name } = req.params
  const { body } = await client.indices.get(name)
  res.send(body)
})

app.delete('/indices/:name', async (req, res) => {
  const { name } = req.params
  const { body } = await client.indices.delete({
    index: name
  })
  res.send(body)
})

app.get(`/${libations}`, async (req, res) => {
  const { body } = await client.search({
    size: 1000,
    track_total_hits: false,
    index: libations,
    body: {
      aggregations: {
        families: {
          terms: {
            field: 'family.keyword'
          }
        }
      }
    }
  })
  res.send(body)
})

app.get(`/${libations}/:id`, async (req, res) => {
  const { id } = req.params
  const { body } = await client.get({
    index: libations,
    id
  })
  res.send(body)
})

app.put(`/${libations}`, async (req, res) => {
  const { body } = await client.indices.create({
    index: libations,
    body: {
      mappings: {
        properties: {
          ingredientsList: {
            type: 'nested'
          }
        }
      }
    }
  })
  res.send(body)
})

app.delete(`/${libations}/:id`, async (req, res) => {
  const { id } = req.params
  const { body } = await client.delete({
    index: libations,
    id
  })
  res.send(body)
})

app.post(`/${libations}`, async (req, res) => {
  const { body } = await client.index({
    index: libations,
    body: req.body
  })
  res.send(body)
})

/**
 * 
 * @param {Object[]} ingredients 
 */
function searchIngredientsList(ingredients) {
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

function searchIngredientsText(ingredients, options) {
  const q = {
    query: {
      bool: {
        must: ingredients.map(name => ({
          match_phrase: {
            ingredients: name
          }
        }))
      }
    },
  }
  if (options.highlight) {
    q.highlight =  {
      pre_tags: ["**"],
      post_tags: ["**"],
      fields: {
        ingredients: {
          type: 'plain'
        }
      }
    }
  }
  return q
}

app.get('/search', async (req, res) => {
  const { ingredients, highlight } = req.query
  const { body } = await client.search({
    index: libations,
    body: searchIngredientsText(ingredients.split(','), { highlight })
  })
  res.send(body)
})

app.listen(PORT, () => console.log(`App listening on port ${PORT}`))