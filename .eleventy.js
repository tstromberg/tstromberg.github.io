
const rssPlugin = require('@11ty/eleventy-plugin-rss');

module.exports = function(eleventyConfig) {
  eleventyConfig.addPlugin(rssPlugin);

  eleventyConfig.addCollection('posts', function(collectionApi) {
    return collectionApi.getFilteredByGlob('posts/**/*.md');
  });

  // Add date filter
  eleventyConfig.addFilter("date", function(dateObj, format) {
    if (!dateObj) return '';
    const date = new Date(dateObj);
    
    if (format === '%Y-%m-%d') {
      return date.toISOString().split('T')[0];
    } else if (format === '%B %d, %Y') {
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
    return date.toISOString().split('T')[0]; // default format
  });

  eleventyConfig.addPassthroughCopy('img');
  eleventyConfig.addPassthroughCopy('css');
  eleventyConfig.addPassthroughCopy('resume');
  eleventyConfig.addPassthroughCopy('posts/**/*.{jpg,jpeg,png,gif,webp,svg}');

  return {
    dir: {
      input: '.',
      includes: '_includes',
      data: '_data',
      output: '_site'
    },
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
};
