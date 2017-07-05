
const request = require('superagent')

var message = `@gabrielstuff already thought about writing the socialite documentation today ?
https://media.giphy.com/media/QZwEKJLuCSlHi/giphy.gif`

request.post(`http://localhost:6060/api/v1/actions/slack`)
  .send({"caption": message})
  .end((err, res) => {
    if(err) {
      console.log(err)
    } else {
      console.log("worked")
    }
  })