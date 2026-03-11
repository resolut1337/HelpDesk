// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract PremiumStatus {
    address payable public owner;
    uint256 public constant PREMIUM_PRICE = 1 ether;

    mapping(address => bool) public isPremium;

    event PremiumPurchased(address indexed user, uint256 amount, uint256 when);
    event PremiumCancelled(address indexed user, uint256 when);
    event Withdrawal(uint amount, uint when);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor() payable {
        owner = payable(msg.sender);
    }

    function buyPremiumStatus() public payable returns (bool) {
        require(msg.value == PREMIUM_PRICE, "You should pay 1 ETH to buy premium status");
        require(!isPremium[msg.sender], "User already has premium status");

        isPremium[msg.sender] = true;
        emit PremiumPurchased(msg.sender, msg.value, block.timestamp);

        return true;
    }

    function cancelPremiumStatus() public returns (bool) {
        require(isPremium[msg.sender], "User does not have premium status");

        isPremium[msg.sender] = false;
        emit PremiumCancelled(msg.sender, block.timestamp);

        return true;
    }

    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Transfer failed");
        emit Withdrawal(balance, block.timestamp);
    }

    function hasPremiumStatus(address user) public view returns (bool) {
        return isPremium[user];
    }
}
