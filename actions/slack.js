'use strict'

const fs = require('fs')
const mime = require('mime')

const config = require('../src/lib/config')
const fetchImage = require('../src/lib/fetch-image')

const WebClient = require('@slack/client').WebClient
let webclient = null

const Slack = require('node-slack-upload')
let slack = null

function upload ({ file, filetype, filename }) {
  return new Promise((resolve, reject) => {
    slack.uploadFile({
      file,
      filetype,
      filename,
      channels: config.actions.slack.channel
    }, (err, data) => {
      err && reject(err)
      resolve(data)
    })
  })
}

function uploadB64 (dataURL) {
  return new Promise((resolve, reject) => {
    const re = /data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/
    const base64 = dataURL.replace(re, '')
    const file = fs.createReadStream(Buffer.from(base64, 'base64'))
    // const file = base64

    const type = dataURL.match(re) || []
    const filetype = type.length ? type[1] : 'image/jpg'
    const filename = filetype.replace(/\//, '.')

    upload({file, filetype, filename})
      .then((success) => { resolve(success) })
      .catch((err) => { reject(err) })
  })
}

function run (options) {
  webclient = new WebClient(config.actions.slack.token)
  slack = new Slack(config.actions.slack.token)

  return new Promise((resolve, reject) => {
    const message = options.message || options.caption

    if (options.path) {
      try {
        const file = fs.createReadStream(options.path)
        const filetype = mime.lookup(options.path)
        const filename = options.path.split(/\//g).pop()

        upload({file, filetype, filename})
          .then((success) => { resolve(success) })
          .catch((err) => { reject(err) })
      } catch (err) {
        reject(err)
      }
    } else if (options.pictureData) {
      uploadB64(options.pictureData)
        .then((success) => { resolve(success) })
        .catch((err) => { reject(err) })
    } else if (options.URL) {
      fetchImage(options.URL)
        .then((imageData) => {
          uploadB64(imageData)
            .then((success) => { resolve(success) })
            .catch((err) => { reject(err) })
        })
        .catch((err) => { reject(err) })
    } else if (message) {
      webclient.chat.postMessage(config.actions.slack.channel, message, (err, res) => {
        err && reject(err)
        resolve(res)
      })
    } else {
      reject('No media or message in request.')
    }
  })
}

module.exports = run