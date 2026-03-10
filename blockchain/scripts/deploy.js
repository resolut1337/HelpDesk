const hre = require("hardhat");

async function main() {
  const Contract = await hre.ethers.getContractFactory("PremiumStatus");
  const premiumStatus = await Contract.deploy();
  await premiumStatus.waitForDeployment();

  const address = await premiumStatus.getAddress();
  console.log("PremiumStatus deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
