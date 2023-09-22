# Dustsweeper Takerbot Readme

Dustsweeper Takerbot is a utility designed to interact with the DustSweeper contract, enabling users to exchange small balance tokens ("dust") for ETH without incurring costly gas transaction fees. This readme provides a simple guide on how to set up and use the bot effectively.

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

3. **Start the Bot**: Initiate the bot's functionality.

   ```bash
   yarn run start
   ```

4. **Deployment with Docker**: If necessary, you can deploy the project using the provided Dockerfile.

Additionally, you'll need to configure the following environment variables:

1. `INFURA_API_KEY`
2. `PK` (private key for the bot's runner)
3. `ONEINCH_API_KEY`

You can customize the configuration according to your requirements:

```javascript
botSettings: {
  conractAddress: '0xb09582787Be1C764C7A15bfF032e133691a5b435',
  refreshInterval: 60 * 1, // 1 minute, how often the cron job will initiate the bot's script
  fromBlock: 18192415 - 8 * 224688, // The block from which the bot will monitor allowance events for the Dustsweeper contract
  chunkSizeForPreparation: 10, // The number of orders for the preparation script
  maxMakersLengthToJoin: 5, // Depending on the length of makers, which SC call data should be joined
  turnOnExecution: false, // Change this after frontrunning issues are resolved
}
```
