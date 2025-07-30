# PageRank Algorithm Demonstration

An interactive web application that demonstrates the PageRank algorithm used by search engines to rank web pages. Created for demonstration during my presentation for the analysis of "The anatomy of a large-scale hypertextual Web search engine" by Sergey Brin and Lawrence Page. 

## Features

- **Interactive Graph Creation**: Add nodes (pages) and create links between them
- **Visual PageRank Calculation**: See PageRank values calculated and displayed in real-time
- **Customizable Parameters**: Adjust damping factor and iteration count
- **Drag & Drop Interface**: Move nodes around and create connections intuitively
- **Analytics Table**: View ranked results in a sortable table

## How to Use

1. **Add Nodes**: Click "Add Node" to create new pages
2. **Create Links**: Hold Shift and drag from one node to another to create links
3. **Delete Elements**: 
   - Hover over a node and click the × button to delete it
   - Click on a link to delete it
4. **Move Nodes**: Click and drag nodes to reposition them
5. **Calculate PageRank**: Click "Calculate PageRank" to see the algorithm in action
6. **Adjust Settings**: Use the sliders to modify damping factor and iterations

## Algorithm Details

The PageRank algorithm calculates the importance of each page based on:
- The number of incoming links
- The importance of the pages that link to it
- A damping factor (default: 0.85) representing the probability of following links

## Technologies Used

- HTML5
- CSS3
- Vanilla JavaScript
- SVG for graph visualization

## Getting Started

Simply open `index.html` in a web browser to start using the application.

## Live Demo

[View the live demo here](https://yourusername.github.io/page-rank)

## License

MIT License - feel free to use and modify as needed.
