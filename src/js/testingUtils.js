// Testing Utilities for MetroNear MVP
// Lightweight debugging and performance measurement tools

// Simple usage analytics
const usageAnalytics = {
    searches: 0,
    errors: 0,
    startTime: Date.now(),
    sessionDuration: () => Math.round((Date.now() - usageAnalytics.startTime) / 1000)
};

export const TestingUtils = {
    // Performance measurement
    performanceMetrics: {
        startTime: null,
        measurements: []
    },
    
    // Start performance timer
    startTimer(label) {
        this.performanceMetrics.startTime = performance.now();
        console.log(`⏱️ Starting: ${label}`);
        return this.performanceMetrics.startTime;
    },
    
    // End performance timer and log result
    endTimer(label) {
        if (!this.performanceMetrics.startTime) {
            console.warn('Timer not started');
            return;
        }
        
        const endTime = performance.now();
        const duration = endTime - this.performanceMetrics.startTime;
        
        const measurement = {
            label,
            duration: Math.round(duration),
            timestamp: new Date().toISOString()
        };
        
        this.performanceMetrics.measurements.push(measurement);
        
        // Log with color coding based on performance
        const color = duration < 3000 ? '🟢' : duration < 5000 ? '🟡' : '🔴';
        console.log(`${color} ${label}: ${Math.round(duration)}ms`);
        
        // Check against PRD requirement (< 3 seconds)
        if (duration > 3000) {
            console.warn(`⚠️ Performance warning: ${label} took ${Math.round(duration)}ms (target: <3000ms)`);
        }
        
        return duration;
    },
    
    // Get all performance measurements
    getPerformanceReport() {
        console.log('📊 Performance Report:');
        console.table(this.performanceMetrics.measurements);
        
        const avgTime = this.performanceMetrics.measurements.reduce((sum, m) => sum + m.duration, 0) / this.performanceMetrics.measurements.length;
        console.log(`Average response time: ${Math.round(avgTime)}ms`);
        
        return this.performanceMetrics.measurements;
    },
    
    // Clear performance metrics
    clearMetrics() {
        this.performanceMetrics.measurements = [];
        this.performanceMetrics.startTime = null;
    },
    
    // Simple usage analytics
    analytics: {
        // Record a search event
        recordSearch() {
            usageAnalytics.searches++;
            console.debug(`📊 Search recorded. Total searches: ${usageAnalytics.searches}`);
        },
        
        // Record an error event
        recordError() {
            usageAnalytics.errors++;
            console.debug(`📊 Error recorded. Total errors: ${usageAnalytics.errors}`);
        },
        
        // Get usage report
        getReport() {
            const report = {
                searches: usageAnalytics.searches,
                errors: usageAnalytics.errors,
                sessionDuration: usageAnalytics.sessionDuration(),
                errorRate: usageAnalytics.searches > 0 ? 
                    Math.round((usageAnalytics.errors / usageAnalytics.searches) * 100) : 0
            };
            
            console.log('📊 Usage Analytics Report:');
            console.log(`   Searches: ${report.searches}`);
            console.log(`   Errors: ${report.errors}`);
            console.log(`   Error Rate: ${report.errorRate}%`);
            console.log(`   Session Duration: ${report.sessionDuration}s`);
            
            return report;
        },
        
        // Reset analytics
        reset() {
            usageAnalytics.searches = 0;
            usageAnalytics.errors = 0;
            usageAnalytics.startTime = Date.now();
            console.log('📊 Analytics reset');
        }
    },
    
    // Simulate API failures for testing
    simulateAPIFailure(type = 'network') {
        const failures = {
            network: () => {
                console.log('🧪 Simulating network failure...');
                return new Error('Network error: Failed to fetch');
            },
            timeout: () => {
                console.log('🧪 Simulating API timeout...');
                return new Error('Timeout: Request took too long');
            },
            rateLimit: () => {
                console.log('🧪 Simulating rate limit...');
                return new Error('Rate limit exceeded');
            },
            emptyResponse: () => {
                console.log('🧪 Simulating empty response...');
                return { routes: [] };
            }
        };
        
        return failures[type] ? failures[type]() : failures.network();
    },
    
    // Test data for Bangalore destinations
    testDestinations: [
        { name: 'MG Road', lat: 12.9746, lng: 77.6096, area: 'Central Bangalore' },
        { name: 'Koramangala', lat: 12.9279, lng: 77.6271, area: 'South Bangalore' },
        { name: 'Indiranagar', lat: 12.9784, lng: 77.6408, area: 'East Bangalore' },
        { name: 'Electronic City', lat: 12.8458, lng: 77.6607, area: 'South Bangalore' },
        { name: 'Whitefield', lat: 12.9698, lng: 77.7500, area: 'East Bangalore' },
        { name: 'Jayanagar', lat: 12.9308, lng: 77.5838, area: 'South Bangalore' },
        { name: 'Malleshwaram', lat: 13.0035, lng: 77.5709, area: 'North Bangalore' },
        { name: 'HSR Layout', lat: 12.9121, lng: 77.6446, area: 'South Bangalore' },
        { name: 'Banashankari', lat: 12.9250, lng: 77.5468, area: 'South Bangalore' },
        { name: 'Yelahanka', lat: 13.1006, lng: 77.5963, area: 'North Bangalore' }
    ],
    
    // Run quick validation test
    async runQuickTest(destination) {
        console.log(`🧪 Testing with destination: ${destination.name}`);
        this.startTimer(`Search-${destination.name}`);
        
        try {
            // Simulate the search process
            console.log(`📍 Coordinates: [${destination.lat}, ${destination.lng}]`);
            console.log(`🏙️ Area: ${destination.area}`);
            
            // Add your actual test logic here
            await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing
            
            this.endTimer(`Search-${destination.name}`);
            console.log('✅ Test completed successfully');
            
        } catch (error) {
            this.endTimer(`Search-${destination.name}`);
            console.error('❌ Test failed:', error);
        }
    },
    
    // Manual testing checklist
    printTestingChecklist() {
        const checklist = `
🧪 METROEAR TESTING CHECKLIST

FUNCTIONAL TESTING:
□ Search functionality works with various destinations
□ Autocomplete suggestions appear and are selectable
□ Map centers on selected destination
□ Station markers are visible and clickable
□ Top 3 recommendations are displayed
□ Primary recommendation is highlighted
□ Fallback indicators appear when applicable

ERROR HANDLING:
□ API failure shows fallback distance
□ Network error displays user-friendly message
□ Empty search shows appropriate message
□ Invalid coordinates are handled gracefully

PERFORMANCE:
□ Response time is under 3 seconds
□ Map loads within reasonable time
□ Autocomplete is responsive

MOBILE TESTING:
□ Layout is responsive on mobile devices
□ Touch interactions work properly
□ Map is usable on small screens
□ Text is readable on mobile

CROSS-BROWSER:
□ Works on Chrome/Edge
□ Works on Firefox
□ Works on Safari (if available)

ACCURACY VERIFICATION:
□ Compare top recommendation with Google Maps
□ Verify distance calculations are reasonable
□ Check that nearest station is recommended
        `;
        
        console.log(checklist);
        return checklist;
    },
    
    // Google Maps comparison guidelines
    printComparisonGuidelines() {
        const guidelines = `
📍 GOOGLE MAPS COMPARISON GUIDELINES

1. SEARCH DESTINATION:
   - Open Google Maps
   - Search for the same destination
   - Note the exact location

2. FIND NEARBY METRO STATIONS:
   - Search for "metro station near [destination]"
   - Identify the 3 closest stations
   - Note their names and approximate distances

3. COMPARE RESULTS:
   - Check if MetroNear recommends the same stations
   - Compare travel times (should be within 2-3 minutes)
   - Verify distance calculations are similar

4. ACCEPTABLE VARIANCE:
   - Time difference: ±3 minutes acceptable
   - Distance difference: ±0.5 km acceptable
   - Station ranking: Top 2 stations should match

5. DOCUMENT DISCREPANCIES:
   - Note any significant differences
   - Check if fallback indicators were shown
   - Verify coordinates are accurate
        `;
        
        console.log(guidelines);
        return guidelines;
    }
};

// Export test destinations for easy access
export const testDestinations = TestingUtils.testDestinations;

// Make testing utilities available globally for console access
if (typeof window !== 'undefined') {
    window.TestingUtils = TestingUtils;
    window.testDestinations = testDestinations;
}