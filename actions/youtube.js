'use strict'

const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy

const config = require('../src/lib/config')
const localStorage = require('../src/lib/localstorage')
const google = require('googleapis')
const youtube = google.youtube('v3')
const mmmagic = require('mmmagic')
const magic = new mmmagic.Magic(mmmagic.MAGIC_MIME_TYPE)

var youtubeSession = JSON.parse(localStorage.getItem('youtube-session')) || { accessToken: '', refreshToken: '' }
var userProfile = JSON.parse(localStorage.getItem('youtube-profile')) || {}

const loginURL = config.actions.youtube.loginURL || '/login/youtube'
const callbackURL = config.actions.youtube.callbackURL || '/login/youtube/return'
const failureURL = config.actions.youtube.failureURL || '/?failure=youtube'
const successURL = config.actions.youtube.successURL || '/?success=youtube'
let privacyStatus = config.actions.youtube.privacyStatus || 'public'

var googleAuth = new google.auth.OAuth2(
  config.actions.youtube.clientID,
  config.actions.youtube.clientSecret,
  config.actions.youtube.callbackURL
)

function storeTokens (atoken, rtoken) {
  youtubeSession.accessToken = atoken
  youtubeSession.refreshToken = rtoken
  localStorage.setItem('youtube-session', JSON.stringify(youtubeSession))
}

function storeProfile (profile) {
  userProfile = profile
  localStorage.setItem('youtube-profile', JSON.stringify(userProfile))
}

function auth (app) {
  passport.use(new GoogleStrategy({
    clientID: config.actions.youtube.clientID,
    clientSecret: config.actions.youtube.clientSecret,
    callbackURL: config.actions.youtube.callbackURL
  },
    function (token, refreshToken, profile, done) {
      storeTokens(token, refreshToken)
      storeProfile(profile)
      googleAuth.setCredentials({ access_token: token, refresh_token: refreshToken })
      done(null, profile)
    }
  ))

  app.get(loginURL, passport.authenticate('google', {
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/youtube'
    ],
    accessType: 'offline',
    prompt: 'select_account'
  }))

  app.get(callbackURL, passport.authenticate('google', {
    failureRedirect: failureURL
  }), (req, res) => {
    res.redirect(successURL)
  })
}

function addRoutes (app) {
  app.get(profileURL, (req, res) => {
    res.send(userProfile)
  })
}

function run (options, request) {
  return new Promise((resolve, reject) => {
    if (!youtubeSession || !youtubeSession.accessToken || youtubeSession.accessToken === '') {
      return reject({
        error: 'invalid token',
        details: 'No access token has been found. Please log in.'
      })
    } else if (!request.files || !request.files[0]) {
      return reject({
        error: 'invalid request',
        details: 'No file has been found. Please upload a file with your request.'
      })
    }

    googleAuth.setCredentials({ access_token: youtubeSession.accessToken, refresh_token: youtubeSession.refreshToken })
    googleAuth.refreshAccessToken((err, tokens) => {
      if (err) {
        return reject(err)
      }

      storeTokens(tokens.access_token, youtubeSession.refreshToken)

      let resource = {
        snippet: {
          title: options.title && options.title !== '' ? options.title : request.files[0].originalname,
          description: options.description ? options.description : ''
        },
        status: {
          privacyStatus: options.privacyStatus && options.privacyStatus !== '' ? options.privacyStatus : privacyStatus
        }
      }

      magic.detect(request.files[0].buffer, (err, res) => {
        if (err) {
          return reject(err)
        }

        let media = {
          mimeType: res,
          body: request.files[0].buffer
        }

        youtube.videos.insert({
          auth: googleAuth,
          part: 'snippet, status',
          resource: resource,
          media: media
        }, (err, result) => {
          if (err) {
            return reject(err)
          }
          return resolve(result)
        })
      })
    })
  })
}

module.exports = {
  loginURL,
  auth,
  addRoutes,
run}
