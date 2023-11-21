# Dustsweeper Takerbot

Dustsweeper Takerbot is designed to interact with the DustSweeper contract, allowing users to swap small balance tokens ("dust") for ETH without incurring expensive gas transaction fees. Here's how to set up and use this bot:

## Project Setup

To configure the project on your local machine, follow these straightforward steps:

1. **Install Dependencies**: Begin by installing the required dependencies for the project.

   ```bash
   yarn install
   ```

2. **Build the Project**: Compile the project's code and prepare it for execution.

   ```bash
   yarn run build
   ```

3. **Upload Lambda**: from archived bundled function `./dist/index.zip`

Additionally, you'll need to configure the following environment variables:

1. `INFURA_API_KEY`
2. `PK` (private key for the bot's runner)
3. `ONEINCH_API_KEY`
4. `FLASHBOTS_AUTH_SIGNER` (any other private key for wallet with no funds, used for flashbots signer reputation)

You can customize the configuration according to your requirements:

```javascript
botSettings: {
  conractAddress: '0xb09582787Be1C764C7A15bfF032e133691a5b435',
  refreshInterval: 60 * 1, // 1 minute, how often the cron job will initiate the bot's script
  chunkSizeForPreparation: 10, // The number of orders for the preparation script
  chunkSizeForTokenMonitoring: 50, // size of chunks with token address to monitor and check allowances
  maxMakersLengthToJoin: 5, // Depending on the length of makers, which SC call data should be joined
  turnOnExecution: false, // Change this after frontrunning issues are resolved
  maxChunkCount: 3, // count of tokenchunks (chunkSizeForTokenMonitoring) in one lambda execution
}
```

## AWS Architecture

CloudWatch Events are triggering the lambda function, which process small part of the token addresses and then saves the last processed chunk number in the S3 bucket. When the lambda is triggered again it will check the S3 bucket and continue with appropriate chunk of token addresses.
