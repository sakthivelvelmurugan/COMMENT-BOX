package com.commentbox.api;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
class CommentboxApiApplicationTests {

	@Test
	void contextLoads() {
	}

	@Test
	void freeDailyLimitShouldBeFive() {
		assertEquals(5, com.commentbox.api.service.UsageLimitService.FREE_DAILY_LIMIT);
	}

}
