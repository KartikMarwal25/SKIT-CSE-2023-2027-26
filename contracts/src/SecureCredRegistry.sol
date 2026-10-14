// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

/// @title SecureCredRegistry
/// @notice Stores the SHA-256 hash + IPFS CID of an issued certificate,
/// emits an event for the worker listener, restricts issuance to
/// owner-registered issuers, and exposes verifyCertificate() and
/// revokeCertificate(). Under review: whether the full 7-state status model
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
        string revocationReason;
    }

    /// @dev certificateHash => Certificate.
    mapping(bytes32 => Certificate) public certificates;

    /// @notice The deployer, permitted to register/deregister issuers.
    address public immutable owner;

    /// @dev issuer address => currently allowed to call issueCertificate.
    mapping(address => bool) public isIssuer;

    error CertificateAlreadyExists(bytes32 certificateHash);
    error CertificateNotFound(bytes32 certificateHash);
    error AlreadyRevoked(bytes32 certificateHash);
    error EmptyReason();
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

    /// @notice Emitted once a certificate is revoked. Permanent — nothing in
    /// this contract can ever move a certificate back out of REVOKED
    /// (BR-03/FR-REV-005).
    event CertificateRevoked(
        bytes32 indexed certificateHash,
        address indexed revokedBy,
        string reason,
        uint256 revokedAt
    );

    event IssuerRegistered(address indexed issuer);
    event IssuerDeregistered(address indexed issuer);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyIssuer() {
        if (!isIssuer[msg.sender]) revert NotIssuer(msg.sender);
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Grants an address permission to call issueCertificate/revokeCertificate.
    /// @param issuer The address to register.
    function registerIssuer(address issuer) external onlyOwner {
        if (issuer == address(0)) revert ZeroAddress();
        isIssuer[issuer] = true;
        emit IssuerRegistered(issuer);
    }

    /// @notice Revokes an address's permission to call issueCertificate/revokeCertificate.
    /// Safe to call on an address that isn't currently registered — it's a
    /// no-op in that case, not a revert.
    /// @param issuer The address to deregister.
    function deregisterIssuer(address issuer) external onlyOwner {
        isIssuer[issuer] = false;
        emit IssuerDeregistered(issuer);
    }

    /// @notice Anchors a new certificate: stores its hash + CID and emits
    /// CertificateIssued. Restricted to registered issuers — the owner
    /// itself is not implicitly an issuer, and must be registered separately
    /// to call this.
    /// @param certificateHash Keccak-256 fingerprint of the off-chain certificate payload.
    /// @param ipfsCid Content identifier of the pinned certificate document.
    function issueCertificate(bytes32 certificateHash, string calldata ipfsCid) external onlyIssuer {
        if (certificates[certificateHash].issuedAt != 0) {
            revert CertificateAlreadyExists(certificateHash);
        }

        certificates[certificateHash] = Certificate({
            certificateHash: certificateHash,
            ipfsCid: ipfsCid,
            issuer: msg.sender,
            issuedAt: block.timestamp,
            status: CertificateStatus.PENDING_STORAGE,
            revocationReason: ''
        });

        emit CertificateIssued(certificateHash, msg.sender, ipfsCid, block.timestamp);
    }

    /// @notice Permanently revokes a certificate (BR-03/FR-REV-005). Any
    /// currently-registered issuer can revoke any certificate — not only the
    /// one that originally issued it, matching the real project's later
    /// design (an institution's registrar staff can turn over; the
    /// certificate shouldn't become unrevokable because the original signer
    /// left).
    /// @param certificateHash The certificate to revoke.
    /// @param reason Human-readable revocation reason (e.g. "issued in error"). Cannot be empty.
    function revokeCertificate(bytes32 certificateHash, string calldata reason) external onlyIssuer {
        Certificate storage cert = certificates[certificateHash];
        if (cert.issuedAt == 0) revert CertificateNotFound(certificateHash);
        if (cert.status == CertificateStatus.REVOKED) revert AlreadyRevoked(certificateHash);
        if (bytes(reason).length == 0) revert EmptyReason();

        cert.status = CertificateStatus.REVOKED;
        cert.revocationReason = reason;

        emit CertificateRevoked(certificateHash, msg.sender, reason, block.timestamp);
    }

    /// @notice Looks up a certificate by its hash and reports one of the four
    /// FR-VER-003 outcomes.
    ///
    /// VERIFIED, REVOKED, and NOT_FOUND are all reachable now that
    /// revokeCertificate() exists. TAMPERED is still structurally
    /// unreachable from an on-chain lookup keyed by hash: a tampered
    /// document produces a hash that was never anchored, which looks
    /// identical to "never issued at all" from this function's point of
    /// view. Detecting tampering requires comparing a freshly-computed hash
    /// against the ORIGINAL hash for a given certificate NUMBER — an
    /// off-chain comparison the API layer must do once a document-upload
    /// verification flow exists (still not built — see UX-OPEN-3).
    ///
    /// @param certificateHash Keccak-256 fingerprint to look up.
    /// @return outcome One of VerificationOutcome's four values.
    function verifyCertificate(bytes32 certificateHash) external view returns (VerificationOutcome outcome) {
        Certificate storage cert = certificates[certificateHash];
        if (cert.issuedAt == 0) {
            return VerificationOutcome.NOT_FOUND;
        }
        if (cert.status == CertificateStatus.REVOKED) {
            return VerificationOutcome.REVOKED;
        }
        return VerificationOutcome.VERIFIED;
    }
}
