// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

/// @title SecureCredRegistry
/// @notice Stores the SHA-256 hash + IPFS CID of an issued certificate,
/// emits an event for the worker listener, restricts issuance to
/// owner-registered issuers, and now exposes verifyCertificate(). Under
/// review: whether the full 7-state status model belongs on-chain at all,
/// or just the terminal ACTIVE/REVOKED distinction, once the backend's own
/// lifecycle service is built out.
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

    /// @notice The four SRS verification outcomes (FR-VER-003). See
    /// verifyCertificate()'s NatSpec for which of these this contract can
    /// actually produce today versus which are structurally deferred.
    enum VerificationOutcome {
        VERIFIED,
        REVOKED,
        TAMPERED,
        NOT_FOUND
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

    /// @notice The deployer, permitted to register/deregister issuers.
    address public immutable owner;

    /// @dev issuer address => currently allowed to call issueCertificate.
    mapping(address => bool) public isIssuer;

    error CertificateAlreadyExists(bytes32 certificateHash);
    error NotOwner();
    error NotIssuer(address caller);
    error ZeroAddress();

    /// @notice Emitted once a certificate's hash + CID are stored on-chain.
    event CertificateIssued(
        bytes32 indexed certificateHash,
        address indexed issuer,
        string ipfsCid,
        uint256 issuedAt
    );

    event IssuerRegistered(address indexed issuer);
    event IssuerDeregistered(address indexed issuer);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Grants an address permission to call issueCertificate.
    /// @param issuer The address to register.
    function registerIssuer(address issuer) external onlyOwner {
        if (issuer == address(0)) revert ZeroAddress();
        isIssuer[issuer] = true;
        emit IssuerRegistered(issuer);
    }

    /// @notice Revokes an address's permission to call issueCertificate.
    /// Safe to call on an address that isn't currently registered — it's a
    /// no-op in that case, not a revert.
    /// @param issuer The address to deregister.
    function deregisterIssuer(address issuer) external onlyOwner {
        isIssuer[issuer] = false;
        emit IssuerDeregistered(issuer);
    }

    /// @notice Anchors a new certificate: stores its hash + CID and emits
    /// CertificateIssued. Restricted to registered issuers as of this week —
    /// the owner itself is not implicitly an issuer, and must be registered
    /// separately to call this.
    /// @param certificateHash Keccak-256 fingerprint of the off-chain certificate payload.
    /// @param ipfsCid Content identifier of the pinned certificate document.
    function issueCertificate(bytes32 certificateHash, string calldata ipfsCid) external {
        if (!isIssuer[msg.sender]) revert NotIssuer(msg.sender);
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

    /// @notice Looks up a certificate by its hash and reports one of the four
    /// FR-VER-003 outcomes.
    ///
    /// Only VERIFIED and NOT_FOUND are actually reachable from this contract
    /// today:
    /// - REVOKED requires a revoke function, which doesn't exist yet (a
    ///   later Sprint task) — nothing can ever set a certificate revoked, so
    ///   this branch is dead code until then, kept here so the enum shape
    ///   the API/frontend build against doesn't have to change later.
    /// - TAMPERED is structurally unreachable from an on-chain lookup keyed
    ///   by hash: a tampered document produces a hash that was never
    ///   anchored, which looks identical to "never issued at all" from this
    ///   function's point of view. Detecting tampering requires comparing a
    ///   freshly-computed hash against the ORIGINAL hash for a given
    ///   certificate NUMBER — an off-chain comparison the API layer must do
    ///   once a document-upload verification flow exists (not this week's
    ///   scope — see UX-OPEN-3, and Keshav's Week 9 identifier-only
    ///   verifier portal).
    ///
    /// @param certificateHash Keccak-256 fingerprint to look up.
    /// @return outcome One of VerificationOutcome's four values.
    function verifyCertificate(bytes32 certificateHash) external view returns (VerificationOutcome outcome) {
        Certificate storage cert = certificates[certificateHash];
        if (cert.issuedAt == 0) {
            return VerificationOutcome.NOT_FOUND;
        }
        return VerificationOutcome.VERIFIED;
    }
}
