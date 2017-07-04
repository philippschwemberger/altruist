'use strict'

const path = require('path')
const request = require('superagent')
const twitter = require('../../actions/twitter')
const settings = require('../../src/lib/settings')
const testSettings = require('../settings.json')
const altruist = require('../../')


altruist.init(settings)

new Promise((resolve, reject) => {
    request.post(`http://localhost:${settings.server.port}/api/v1/actions/twitter`)
      .send({"message": "twitterBot here"})
      .end((err, res) => {
        if (err) {
          reject(new Error(err))
        } else {
          try {
            resolve()
          } catch (e) {
            reject(new Error(e))
          }
        }
      })
})
