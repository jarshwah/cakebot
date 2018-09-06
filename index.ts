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

interface SlackCommand {
    token: string,
    team_id: string,
    team_domain: string,
    channel_id: string,
    user_id: string,
    user_name: string,
    command: string,
    text: string,
    response_url: string,
    trigger_id: string,
}

interface LambdaRequest {
    token: string,
    type: string,
    event: SlackMessage,
}

interface CakeDocument {
    user: string,
    count: number,
}

const verifyToken = (token: string, resp: cloud.Response): boolean => {
    if (token != config.verificationToken) {
        console.log("Failed token verification")
        resp.status(401).write("Incorrect token").end()
        return false
    }
    console.log("Passed token verification")
    return true
}

const challenge = async (data: SlackVerify, resp: cloud.Response): Promise<void> => {
    console.log("Running verify")
    resp.status(200).json({ challenge: data.challenge })
}

const processMessage = async (event: SlackMessage, resp: cloud.Response): Promise<void> => {
    // test the message for a match and not a bot
    console.log("Running processMessage")
    if (!event.bot_id && /cake/ig.test(event.text)) {
        console.log("Not a bot!")

        console.log("Calculating cakes")
        let item: CakeDocument = await cakeCounter.get({ user: event.user })
        let count = ((item && item.count) || 0) + 1
        await cakeCounter.insert(<CakeDocument>({ user: event.user, count }))
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
        resp.status(200).write("success").end()
        return
    }
    console.log("Ignoring message")
    resp.status(200).write("ignored").end()
}

const handler = async (data: SlackVerify | LambdaRequest, resp: cloud.Response): Promise<void> => {
    console.log("Choosing event handler")
    switch (data.type) {
        case "url_verification":
            await challenge((<SlackVerify>data), resp)
            break

        case "event_callback":
            await processMessage((<LambdaRequest>data).event, resp)
            break

        default:
            resp.status(200).write("unknown event").end()
    }
}

const cakeCount = async (data: SlackCommand, resp: cloud.Response) => {
    console.log("Rendering leaderboard")
    let rg = /^\s?(\d)$/g
    let match = rg.exec(data.text)
    if (match) {
        return resp.status(200).write(
            renderLeaderBoard(await getLeaderBoard(+match[0]))
        ).end()
    }
    return resp.status(200).write(
        renderLeaderBoard(await getLeaderBoard(3))
    ).end()
}

const getLeaderBoard = async (topN: number): Promise<CakeDocument[]> => {
    let allCakes: CakeDocument[] = await cakeCounter.scan()
    return allCakes.sort((a, b) => a.count - b.count).reverse().slice(0, topN)
}

const renderLeaderBoard = (users: CakeDocument[]) => {
    return users.reduceRight((accum, elem) =>
        `${accum}<@${elem.user}> has been caked ${elem.count} times\n`,
        ""
    )
}

endPoint.post("/cake/events", async (req, resp) => {
    console.log("Received Event Request")
    let data: SlackVerify | LambdaRequest = JSON.parse(req.body.toString())
    if (!verifyToken(data.token, resp)) {
        return
    }
    await handler(data, resp)
    console.log("Finished handler")
})

endPoint.post("/cake/command", async (req, resp) => {
    // Only has 3000ms to return a result
    console.log("Received Command Request")
    let parsed: SlackCommand = qs.parse(req.body.toString())

    if (!verifyToken(parsed.token, resp)) {
        return
    }

    switch (parsed.command) {
        case "/cakecount":
            return await cakeCount(parsed, resp)

        default:
            resp.status(200).write("Unknown Command Received").end()
    }
})

const url = endPoint.publish().url
url.apply(resolvedUrl => console.log(`Published to: ${resolvedUrl}`))

exports.url = url
