# cakebot

A pulumi built slackbot that tracks cake snipes

## Cake Snipes

A wonderful teaching opportunity presents itself when a co-worker leaves their laptop
unlocked and unattended. Traditionally you'd write a funny quip from that co-worker
into a public slack channel.

> Hurr Durr I'm a dumb dumb

or

> I do bad code

The lesson? Co-workers can be jerks. But we pretend it's for teaching security.

We like to call this behaviour "sniping".

I was recently introduced to a new concept, [via the twitters](https://twitter.com/WaveHack/status/1035831418620993536), whereby instead of
writing unfunny comments on behalf of a co-worker, you instead write "cake". Each
"cake" is worth 1 point against. 3 points against and you buy cake (or donuts, or
other tasty pastries) for the entire team.

Hence, cake snipe.

I'm still not sure if gamifying this behaviour is a good or bad thing, but let
there be cake.

## Setup

You'll need to configure your own Slack application in your own Slack organisation. These
are the basics:

- Visit https://api.slack.com/apps and Create New App
- Copy your `Verification Token` and `Access Token` as we'll need them shortly
- Under `OAuth & Permissions` add the `channels:history` and `chat:write` scopes
- Under `Event Subscriptions` add `message.channels` to Selected Events
- Under `Event Subscriptions` you'll need to add the Bot URL (see below) to Request URL

To install the bot, you'll need to [install pulumi](https://pulumi.io/quickstart/install.html)
which is a set of libraries and tools for automating cloud infrastructure. We'll use
this to create a Lambda function and API Gateway in AWS. You'll need to create a
Pulumi account - this is free at the time of writing.

Add your tokens to the Pulumi configuration, and setup your AWS keys:

```
npm install
export AWS_PROFILE=<profile-name>  # aws credentials
pulumi config set cloud:provider aws
pulumi config set --secret cakebot:verificationToken <your-slack-verification-token>
pulumi config set --secret cakebot:slackToken <xoxa-2-your-slack-api-token>
```

Now, create the AWS resources and upload the bot:

```
pulumi update  # provisions AWS resources and uploads the lambda
```

The output will show you the URL for interacting with your bot. Plug it into the
Slack bot `Event Subscriptions` Request URL section with `/cake/events` suffixed.
If everything worked, the URL will show `Verified` next to it.

![Cakebot URL](docs/verified-bot-url.png)

Now, invite your bot into the channels you want it to monitor for cake. Type a
few messages including the word cake, and you should start seeing responses from
your bot!

![Cakebot Screenshot](docs/cake-shot.png)

## Troubleshooting

- Make sure your URLs do NOT have trailing slashes
- Cloudwatch logs will be very valuable for diagnosing issues
- There can sometimes be large delays (10 - 20s) before cake bot sends a response

## Features

See Issues for a list of TODO items. This is a work in progress. So far the bot
will track the number of cakes and respond to each instance.
