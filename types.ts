interface ChallengeRequest {
    token: string,
    challenge: string,
    type: "url_verification"
}

type CallbackError = string | null
type LambdaCallback = (error: CallbackError, response: Object) => void
