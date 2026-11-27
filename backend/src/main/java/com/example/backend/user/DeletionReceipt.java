package com.example.backend.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "account_deletion_receipts")
class DeletionReceipt {
    @Id
    @Column(name = "secret_hash", length = 64)
    private String secretHash;
    protected DeletionReceipt() {}
    DeletionReceipt(String secretHash) { this.secretHash = secretHash; }
}
