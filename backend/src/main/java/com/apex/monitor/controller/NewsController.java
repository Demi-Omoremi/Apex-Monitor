package com.apex.monitor.controller;


import com.apex.monitor.model.News;
import com.apex.monitor.service.NewsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@CrossOrigin("*")
@RequestMapping("/api/streams")
public class NewsController {
    private final NewsService newsService;

    public NewsController(NewsService newsService) {
        this.newsService = newsService;
    }


    @GetMapping("/market/news")
    public ResponseEntity<List<News>> getMarketNews(@RequestParam(defaultValue = "10") int limit) {
        List<News> recentMarketNews = newsService.getRecentMarketNews(limit);
        return ResponseEntity.ok(recentMarketNews);
    }


    @GetMapping("/{symbol}/news")
    public ResponseEntity<List<News>> getCompanyNews(@PathVariable String symbol, @RequestParam(defaultValue = "10") int limit) {
        List<News> companyNews = newsService.getRecentCompanyNews(limit, symbol);
        return ResponseEntity.ok(companyNews);
    }





}
