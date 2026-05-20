package com.commentbox.api.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;

@Component
public class JwtUtil {

    private static final Logger log = LoggerFactory.getLogger(JwtUtil.class);
    private static final String HMAC_ALGO = "HmacSHA256";

    private final byte[] keyBytes;
    private final long expirationMs;
    private final ObjectMapper mapper = new ObjectMapper();

    public JwtUtil(@Value("${jwt.secret:}") String jwtSecret,
                   @Value("${jwt.expiration-ms:86400000}") long expirationMs) {
        this.expirationMs = expirationMs;
        if (jwtSecret == null || jwtSecret.isBlank()) {
            // generate ephemeral key
            byte[] k = new byte[32];
            new SecureRandom().nextBytes(k);
            this.keyBytes = k;
            log.warn("No JWT secret provided (JWT_SECRET). Generated an ephemeral signing key — tokens will not survive restarts.");
        } else {
            byte[] raw = jwtSecret.getBytes(StandardCharsets.UTF_8);
            // pad/truncate to 32 bytes
            byte[] k = new byte[32];
            System.arraycopy(raw, 0, k, 0, Math.min(raw.length, 32));
            this.keyBytes = k;
        }
    }

    public String generateToken(org.springframework.security.core.userdetails.UserDetails user) {
        try {
            long now = Instant.now().getEpochSecond();
            long exp = now + (expirationMs / 1000);
            String header = mapper.writeValueAsString(Map.of("alg", "HS256", "typ", "JWT"));
            String payload = mapper.writeValueAsString(Map.of("sub", user.getUsername(), "iat", now, "exp", exp));
            String encodedHeader = base64Url(header.getBytes(StandardCharsets.UTF_8));
            String encodedPayload = base64Url(payload.getBytes(StandardCharsets.UTF_8));
            String signingInput = encodedHeader + "." + encodedPayload;
            String signature = base64Url(hmac(signingInput.getBytes(StandardCharsets.UTF_8)));
            return signingInput + "." + signature;
        } catch (Exception ex) {
            throw new RuntimeException("Failed to generate token", ex);
        }
    }

    public String extractEmail(String token) {
        try {
            Map<String, Object> payload = parseAndValidate(token);
            Object sub = payload.get("sub");
            return sub != null ? sub.toString() : null;
        } catch (Exception ex) {
            return null;
        }
    }

    public boolean isTokenValid(String token, org.springframework.security.core.userdetails.UserDetails user) {
        try {
            Map<String, Object> payload = parseAndValidate(token);
            Object sub = payload.get("sub");
            Object expObj = payload.get("exp");
            long exp = expObj instanceof Number ? ((Number) expObj).longValue() : Long.parseLong(expObj.toString());
            long now = Instant.now().getEpochSecond();
            return sub != null && sub.toString().equals(user.getUsername()) && exp > now;
        } catch (Exception ex) {
            return false;
        }
    }

    private Map<String, Object> parseAndValidate(String token) throws Exception {
        String[] parts = token.split("\\.");
        if (parts.length != 3) throw new IllegalArgumentException("Invalid token format");
        String signingInput = parts[0] + "." + parts[1];
        byte[] sig = base64UrlDecode(parts[2]);
        byte[] expected = hmac(signingInput.getBytes(StandardCharsets.UTF_8));
        if (!constantTimeEquals(sig, expected)) throw new IllegalArgumentException("Invalid signature");
        byte[] payloadBytes = base64UrlDecode(parts[1]);
        return mapper.readValue(payloadBytes, Map.class);
    }

    private byte[] hmac(byte[] data) throws Exception {
        Mac mac = Mac.getInstance(HMAC_ALGO);
        SecretKeySpec key = new SecretKeySpec(keyBytes, HMAC_ALGO);
        mac.init(key);
        return mac.doFinal(data);
    }

    private static boolean constantTimeEquals(byte[] a, byte[] b) {
        if (a.length != b.length) return false;
        int res = 0;
        for (int i = 0; i < a.length; i++) res |= a[i] ^ b[i];
        return res == 0;
    }

    private static String base64Url(byte[] in) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(in);
    }

    private static byte[] base64UrlDecode(String s) {
        return Base64.getUrlDecoder().decode(s);
    }
}
