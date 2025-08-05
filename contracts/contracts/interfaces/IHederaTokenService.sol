// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IHederaTokenService
 * @dev Interface for Hedera Token Service interactions
 */
interface IHederaTokenService {
    struct TokenKey {
        uint256 keyType;
        bytes key;
    }

    struct Token {
        string name;
        string symbol;
        address treasury;
        string memo;
        bool tokenSupplyType;
        int64 maxSupply;
        bool freezeDefault;
        TokenKey[] tokenKeys;
        uint256 expiry;
    }

    function createFungibleToken(
        Token memory token,
        uint initialTotalSupply,
        uint decimals
    ) external payable returns (int responseCode, address tokenAddress);

    function createNonFungibleToken(
        Token memory token
    ) external payable returns (int responseCode, address tokenAddress);

    function mintToken(
        address token,
        uint64 amount,
        bytes[] memory metadata
    ) external returns (int responseCode, uint64 newTotalSupply, int64[] memory serialNumbers);

    function transferToken(
        address token,
        address sender,
        address recipient,
        int64 amount
    ) external returns (int responseCode);

    function associateToken(
        address account,
        address token
    ) external returns (int responseCode);
}