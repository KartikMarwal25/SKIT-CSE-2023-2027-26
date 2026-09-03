// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

/// @title SecureCredRegistry
/// @notice Skeleton only — data structure, status model, and the
/// `issueCertificate` signature this week. Access control, hash/CID
/// storage wiring, and events land in Weeks 4-6 as the surrounding backend
/// pipeline (issuance service, chain adapter) gets built to call into it.
contract SecureCredRegistry {
    /// @notice Mirrors the off-chain certificate lifecycle's early states —
    /// under review: whether the full state machine belongs on-chain at all,
    /// or whether only the terminal ACTIVE/REVOKED distinction does, once
    /// the backend's own lifecycle service (see docs/architecture/certificate-lifecycle.md)
    /// is built out. Kept as the full enum for now per this week's task.
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

    /// @notice Anchors a new certificate. Signature only this week — no
    /// access control, no event emission, no actual state write yet.
    /// @param certificateHash Keccak-256 fingerprint of the off-chain certificate payload.
    /// @param ipfsCid Content identifier of the pinned certificate document.
    function issueCertificate(bytes32 certificateHash, string calldata ipfsCid) external {
        // TODO(Week 4-6): access control (issuer-only), write to `certificates`,
        // emit an event for the worker listener. Left unimplemented so this
        // compiles and is reviewable as a signature before the body exists.
    }
}
