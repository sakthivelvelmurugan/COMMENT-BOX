package com.commentbox.api.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.Objects;

@Component
public class JwtUtil {

    private static final Logger log = LoggerFactory.getLogger(JwtUtil.class);

    private final Key signingKey;
    private final long expirationMs;

    public JwtUtil(@Value("${jwt.secret:}") String jwtSecret,
                   @Value("${jwt.expiration-ms:86400000}") long expirationMs) {
        this.expirationMs = expirationMs;
        if (Objects.isNull(jwtSecret) || jwtSecret.isBlank()) {
            // generate a temporary key for development if none provided
            this.signingKey = Keys.secretKeyFor(SignatureAlgorithm.HS256);
            log.warn("No JWT secret provided (JWT_SECRET). Generated an ephemeral signing key — tokens will not survive restarts. Set JWT_SECRET in your environment for persistent tokens.");
        } else {
            this.signingKey = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        }
    }

    public String generateToken(org.springframework.security.core.userdetails.UserDetails user) {
        Date now = new Date();
        Date exp = new Date(now.getTime() + expirationMs);
        return Jwts.builder()
                .setSubject(user.getUsername())
                .setIssuedAt(now)
                .setExpiration(exp)
                .signWith(signingKey, SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractEmail(String token) {
        try {
            Claims claims = Jwts.parser()
                    .setSigningKey(signingKey)
                    .parseClaimsJws(token)
                    .getBody();
            return claims.getSubject();
        } catch (JwtException ex) {
            return null;
        }
    }

    public boolean isTokenValid(String token, org.springframework.security.core.userdetails.UserDetails user) {
        try {
            Claims claims = Jwts.parser()
                    .setSigningKey(signingKey)
                    .parseClaimsJws(token)
                    .getBody();
            String email = claims.getSubject();
            Date exp = claims.getExpiration();
            return email != null && email.equals(user.getUsername()) && exp != null && exp.after(new Date());
        } catch (JwtException ex) {
            return false;
        }
    }
}
