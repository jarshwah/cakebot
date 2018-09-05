import * as pulumi from '@pulumi/pulumi'

let config = new pulumi.Config(pulumi.getProject());

export const slackChannel: string = config.get("slackChannel") || "general"
export const slackToken: string = config.require("slackToken")
export const verificationToken: string = config.require("verificationToken")
