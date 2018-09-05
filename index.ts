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
    bot_id?: string,
    text: string,
    user: string,
    channel: string,
}

interface LambdaRequest {
    token: string,
    type: string,
    event: SlackMessage,
}

const verify = async (data: SlackVerify, callback: cloud.Response): Promise<void> => {
  console.log("Running verify")
  callback.status(200).json({challenge: data.challenge})
}

const processMessage = async (event: SlackMessage, callback: cloud.Response): Promise<void> => {
    // test the message for a match and not a bot
    console.log("Running processMessage")
    if (!event.bot_id && /cake/ig.test(event.text)) {
        console.log("Not a bot!")

        console.log("Calculating cakes")
        let item = await cakeCounter.get({user: event.user})
        let count = ((item && item.count) || 0) + 1
        await cakeCounter.insert({user: event.user, count})
        console.log(`User ${event.user} has caked ${count} times`)

        let text = `<@${event.user}> I hear you like cake? In fact, you've liked cake ${count} times!`
        let message = {
            token: config.slackToken,
            channel: event.channel,
            text: text
        }

        console.log("Posting our message")
        let query = qs.stringify(message)
        await https.get(`https://slack.com/api/chat.postMessage?${query}`)
        console.log("Message posted, returning success")
        callback.status(200).write("success").end()
        return
    }
    console.log("Ignoring message")
    callback.status(200).write("ignored").end()
}

const handler = async (data: SlackVerify | LambdaRequest, callback: cloud.Response): Promise<void> => {
    console.log("Running handler")
    if (data.token != config.verificationToken) {
        callback.status(401).write("Incorrect token").end()
        console.error("Error writing callback")
        return
    }

    console.log("Choosing event handler")
    switch (data.type) {
        case "url_verification":
            await verify((<SlackVerify>data), callback)
            break

        case "event_callback":
            await processMessage((<LambdaRequest>data).event, callback)
            break

        default:
            callback.status(200).write("unknown event").end()
    }
}

endPoint.post("/cake/events", async (req, resp) => {
    console.log("Received Request")
    let data: SlackVerify | LambdaRequest = JSON.parse(req.body.toString())
    await handler(data, resp)
    console.log("Finished handler")
})

const url = endPoint.publish().url
url.apply(resolvedUrl => console.log(`Published to: ${resolvedUrl}`))

exports.url = url
