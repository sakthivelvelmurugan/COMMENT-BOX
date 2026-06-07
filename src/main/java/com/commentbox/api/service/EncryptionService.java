package com.commentbox.api.service;

import com.commentbox.api.util.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;

@Service
public class EncryptionService {

    private static final String ALGO = "AES/GCM/NoPadding";
    private static final int IV_SIZE = 12;
    private static final int TAG_BITS = 128;
    // Minimum ciphertext = IV (12) + GCM tag (16) = 28 bytes
    private static final int MIN_ENCRYPTED_LENGTH = IV_SIZE + (TAG_BITS / 8);

    private final byte[] keyBytes;
    private final SecureRandom secureRandom = new SecureRandom();
    private final boolean encryptionEnabled;

    public EncryptionService(@Value("${byok.encryption.secret:}") String secret) {
        if (secret == null) secret = "";
        secret = secret.trim();

        // Warn and disable encryption if no real secret is configured
        this.encryptionEnabled = !secret.isEmpty()
                && !secret.contains("${")
                && !secret.startsWith("env:");

        byte[] raw = secret.getBytes(StandardCharsets.UTF_8);
        this.keyBytes = Arrays.copyOf(raw, 32); // pad/truncate to 256 bits
    }

    public boolean isEncryptionEnabled() {
        return encryptionEnabled;
    }

    public String encrypt(String plainText) {
        if (!encryptionEnabled) {
            // Return plaintext as-is if encryption is not configured
            return plainText;
        }
        if (plainText == null || plainText.isBlank()) {
            throw new ApiException("Cannot encrypt blank input", 400);
        }
        try {
            byte[] iv = new byte[IV_SIZE];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGO);
            cipher.init(Cipher.ENCRYPT_MODE, buildKey(), new GCMParameterSpec(TAG_BITS, iv));
            byte[] cipherText = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

            // Layout: [IV (12 bytes)][cipherText + GCM tag (16 bytes)]
            byte[] out = new byte[IV_SIZE + cipherText.length];
            System.arraycopy(iv, 0, out, 0, IV_SIZE);
            System.arraycopy(cipherText, 0, out, IV_SIZE, cipherText.length);

            return Base64.getEncoder().encodeToString(out);
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ApiException("Encryption failed: " + ex.getMessage(), 500);
        }
    }

    public String decrypt(String encryptedText) {
        if (!encryptionEnabled) {
            // Pass through plaintext if encryption is not configured
            return encryptedText;
        }
        if (encryptedText == null || encryptedText.isBlank()) {
            throw new ApiException("Cannot decrypt blank input", 400);
        }
        try {
            byte[] all = Base64.getDecoder().decode(encryptedText);

            if (all.length < MIN_ENCRYPTED_LENGTH) {
                throw new ApiException(
                    "Encrypted payload too short (" + all.length + " bytes); expected at least " + MIN_ENCRYPTED_LENGTH,
                    400
                );
            }

            byte[] iv = Arrays.copyOfRange(all, 0, IV_SIZE);
            byte[] cipherText = Arrays.copyOfRange(all, IV_SIZE, all.length);

            Cipher cipher = Cipher.getInstance(ALGO);
            cipher.init(Cipher.DECRYPT_MODE, buildKey(), new GCMParameterSpec(TAG_BITS, iv));
            byte[] plain = cipher.doFinal(cipherText);

            return new String(plain, StandardCharsets.UTF_8);
        } catch (ApiException ex) {
            throw ex;
        } catch (IllegalArgumentException ex) {
            // Base64 decode failure
            throw new ApiException("Invalid encrypted payload (bad Base64): " + ex.getMessage(), 400);
        } catch (Exception ex) {
            // Covers AEADBadTagException (tampered/wrong key) and others
            throw new ApiException("Decryption failed — key mismatch or corrupted payload", 400);
        }
    }

    private SecretKeySpec buildKey() {
        return new SecretKeySpec(keyBytes, "AES");
    }
}