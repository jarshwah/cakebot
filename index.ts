import * as cloud from "@pulumi/cloud"
import * as https from "https"
import * as qs from "qs"

import * as config from "./config"

// AWS Resources
let cakeCounter = new cloud.Table("cakeCounter", "user", "string")
let endPoint = new cloud.API("cakebot")


interface SlackVerify {
    token: string,
    challenge: string,
    type: string,
}

interface SlackMessage {
    bot_id: Boolean,
    text: string,
    user: string,
    channel: string,
}

interface LambdaRequest {
    token: string,
    type: string,
    event: SlackMessage,
}

const verify = (data: SlackVerify, callback: cloud.Response): void => {
  callback.status(200).json({challenge: data.challenge})
}

const process = async (event: SlackMessage, callback: cloud.Response): Promise<void> => {
    // test the message for a match and not a bot
    if (!event.bot_id && /cake/ig.test(event.text)) {
        let text = `<@${event.user}> I hear you like cake?`;
        let message = {
            token: config.slackToken,
            channel: event.channel,
            text: text
        }

        let query = qs.stringify(message); // prepare the querystring
        https.get(`https://slack.com/api/chat.postMessage?${query}`)

        let item = await cakeCounter.get({user: event.user})
        let count = ((item && item.count) || 0) + 1
        await cakeCounter.insert({user: event.user, count})
        console.log(`User ${event.user} has caked ${count} times`)
        callback.status(200).write("success")
    }
    callback.status(200).write("ignored")
}

const handler = (data: SlackVerify | LambdaRequest, callback: cloud.Response): void => {

    if (data.token == config.verificationToken) {
      callback.status(401).write("Incorrect token")
      return
    }

    switch (data.type) {
        case "url_verification":
            verify((<SlackVerify>data), callback)
            break

        case "event_callback":
            process((<LambdaRequest>data).event, callback)
            break

        default:
            callback.status(200).write("unknown event")
    }
}

endPoint.post("/cake/events", (req, resp) => {
    console.log("Received Request")
    console.log("Req Body: ", + req.body.toString())
    let data: SlackVerify | LambdaRequest = JSON.parse(req.body.toString());
    handler(data, resp)
})

const url = endPoint.publish().url
url.apply(resolvedUrl => console.log(`Published to: ${resolvedUrl}`))

exports.url = url
