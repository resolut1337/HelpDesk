const hre = require("hardhat");

async function main() {
  const recipient = process.env.RECIPIENT;
  const amount = process.env.AMOUNT || "10";

  if (!recipient) {
    throw new Error("Set RECIPIENT env var with target wallet address.");
  }

  const [sender] = await hre.ethers.getSigners();
  const tx = await sender.sendTransaction({
    to: recipient,
    value: hre.ethers.parseEther(amount),
  });

  await tx.wait();
  console.log(`Sent ${amount} ETH to ${recipient}`);
  console.log(`Tx hash: ${tx.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
