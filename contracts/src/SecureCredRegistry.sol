// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

/// @title SecureCredRegistry
/// @notice Stores the SHA-256 hash + IPFS CID of an issued certificate and
/// emits an event for the worker listener. Access control still isn't wired
/// (lands Week 6) — under review: whether the full 7-state status model
/// belongs on-chain at all, or just the terminal ACTIVE/REVOKED distinction,
/// once the backend's own lifecycle service is built out.
contract SecureCredRegistry {
    enum CertificateStatus {
        PENDING_STORAGE,
        PENDING_ANCHOR,
        ANCHORING,
        ACTIVE,
        REVOKING,
        REVOKED,
        FAILED
    }

    struct Certificate {
        bytes32 certificateHash;
        string ipfsCid;
        address issuer;
        uint256 issuedAt;
        CertificateStatus status;
    }

    /// @dev certificateHash => Certificate.
    mapping(bytes32 => Certificate) public certificates;

    error CertificateAlreadyExists(bytes32 certificateHash);

    /// @notice Emitted once a certificate's hash + CID are stored on-chain.
    /// This resolves the event-signature open question from Kavish's Week 3
    /// test plan (docs/testing/test-strategy.md).
    event CertificateIssued(
        bytes32 indexed certificateHash,
        address indexed issuer,
        string ipfsCid,
        uint256 issuedAt
    );

    /// @notice Anchors a new certificate: stores its hash + CID and emits
    /// CertificateIssued. Any address can still call this today — issuer-only
    /// access control is a Week 6 task, not this week's.
    /// @param certificateHash Keccak-256 fingerprint of the off-chain certificate payload.
    /// @param ipfsCid Content identifier of the pinned certificate document.
    function issueCertificate(bytes32 certificateHash, string calldata ipfsCid) external {
        if (certificates[certificateHash].issuedAt != 0) {
            revert CertificateAlreadyExists(certificateHash);
        }

        certificates[certificateHash] = Certificate({
            certificateHash: certificateHash,
            ipfsCid: ipfsCid,
            issuer: msg.sender,
            issuedAt: block.timestamp,
            status: CertificateStatus.PENDING_STORAGE
        });

        emit CertificateIssued(certificateHash, msg.sender, ipfsCid, block.timestamp);
    }
}
