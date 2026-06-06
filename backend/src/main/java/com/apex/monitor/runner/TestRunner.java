package com.apex.monitor.runner;

import net.jacobpeterson.alpaca.AlpacaAPI;

import net.jacobpeterson.alpaca.openapi.trader.model.Account;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class TestRunner implements CommandLineRunner {

    private final AlpacaAPI alpacaAPI;

    // Spring automatically injects the AlpacaAPI bean we configured earlier
    public TestRunner(AlpacaAPI alpacaAPI) {
        this.alpacaAPI = alpacaAPI;
    }

    @Override
    public void run(String... args) {
        System.out.println("====== ALPACA CONNECTION TEST ======");
        try {
            // This forces a network call to fetch your mock profile data
            Account account = alpacaAPI.trader().accounts().getAccount();

            System.out.println("🟢 SUCCESS! Connected to Alpaca API.");
            System.out.println("   Account Number: " + account.getAccountNumber());
            System.out.println("   Buying Power:   $" + account.getBuyingPower());
            System.out.println("====================================");

        } catch (Exception e) {
            System.out.println("🔴 CONNECTION FAILED!");
            System.out.println("   Reason: " + e.getMessage());
            System.out.println("   Check your environment variable names or key credentials.");
            System.out.println("====================================");
        }
    }
}