pragma solidity >=0.8.2 <0.9.0;

import "hardhat/console.sol";

/// @param v Part of the ECDSA signature
/// @param r Part of the ECDSA signature
/// @param s Part of the ECDSA signature
/// @param request Identifier for verifying the packet is what is desired
/// , rather than a packet for some other function/contract
/// @param deadline The Unix timestamp (in seconds) after which the packet
/// should be rejected by the contract
/// @param payload The payload of the packet
struct TrustusPacket {
    uint8 v;
    bytes32 r;
    bytes32 s;
    bytes32 request;
    uint256 deadline;
    bytes payload;
}

// Define the DustSweeper contract interface
interface DustSweeper {
    function sweepDust(address[] calldata makers, address[] calldata tokenAddresses, TrustusPacket calldata packet) external payable;
}

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract TakerBot {
    address public constant DUSTSWEEPER_ADDRESS = 0x78106f7db3EbCEe3D2CFAC647f0E4c9b06683B39;
    address constant ZERO_ADDRESS = address(0);
    uint256 constant MAX_UINT256 = type(uint256).max;
    address constant WETH = address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2); // Replace with the actual WETH address
    address[] public ROUTERS = [
        0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D,  // uniswap
        0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F   // sushi
    ];

    mapping(address => mapping(address => bool)) public isApproved;

    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function compareAndSwap(address tokenAddress) private returns (bool) {
        console.log("Comparing and swapping");
        uint256 amount = IERC20(tokenAddress).balanceOf(address(this));

        if (amount > 0) {
            uint256 bestExpected = 0;
            address router;

            address[] memory path = new address[](2);
            path[0] = tokenAddress;
            path[1] = WETH;

            for (uint256 i = 0; i < ROUTERS.length; i++) {
                (bool success, bytes memory data) = address(ROUTERS[i]).call(
                    abi.encodeWithSignature(
                        "getAmountsOut(uint256,address[])",
                        amount,
                        path
                    )
                );

                if (success) {
                    uint256 expected = abi.decode(data, (uint256));
                    if (expected > bestExpected) {
                        bestExpected = expected;
                        router = ROUTERS[i];
                    }
                } else {
                    // Handle the call failure here (e.g., log an error or take appropriate action).
                }
            }

            // Make sure the router is approved to transfer the coin
            if (!isApproved[router][tokenAddress]) {

                // Check the current allowance of the router contract for the token
                uint256 currentAllowance = IERC20(tokenAddress).allowance(address(this), router);

                if (currentAllowance < amount) {
                    // Approve the router contract to spend the required amount of tokens
                    bool approvalSuccess = IERC20(tokenAddress).approve(router, amount);

                    require(approvalSuccess, "Approval failed");
                }

                isApproved[router][tokenAddress] = true;
                // bytes memory approvalResponse = IERC20(tokenAddress).approve(router, MAX_UINT256);
                // require(abi.decode(approvalResponse, (bool)), "Approval failed");
                // isApproved[router][tokenAddress] = true;
            }

            (bool swapSuccess, ) = router.call{value: 0}(
                abi.encodeWithSignature(
                    "swapExactTokensForETH(uint256,uint256,address[],address,uint256)",
                    amount,
                    bestExpected,
                    path,
                    owner,
                    block.timestamp + 60
                )
            );

            require(swapSuccess, "Swap failed");
        }

        return true;
    }
    // You will need to implement this function separately

    function runSweep(
      address[] calldata makers,
      address[] calldata tokenAddresses,
      TrustusPacket calldata packet
    ) public payable {
        console.log("Running sweep");
        uint256 startGas = gasleft();
        uint256 startBalance = address(this).balance;

        console.log("getting DustSweeper");

        DustSweeper dustSweeper = DustSweeper(DUSTSWEEPER_ADDRESS);

        console.log("running sweepDust");
        console.log(msg.value);
        console.log(address(this).balance);
        console.log(packet.deadline);
        
        // Call the sweepDust function on the DustSweeper contract
        dustSweeper.sweepDust{value: msg.value}(makers, tokenAddresses, packet);

        console.log("iterating through token addresses");
        // Iterate through token addresses and call compare_and_swap
        for (uint256 i = 0; i < tokenAddresses.length; i++) {
            compareAndSwap(tokenAddresses[i]);
        }

        uint256 endGas = gasleft();
        uint256 endBalance = address(this).balance;
        uint256 diffGas = startGas - endGas;
        uint256 diffBalance = endBalance - startBalance;
        uint256 txCost = diffGas * tx.gasprice;

        require(txCost < diffBalance, "Transaction cost exceeds balance difference");
    }
}
