const express = require('express');
const fs = require('fs');
const app = express();
const axios = require('axios');

// DBpedia SPARQL endpoint
const SPARQL_ENDPOINT = "http://dbpedia.org/sparql";




// Function to query the DBpedia SPARQL endpoint
async function queryDbpedia(sparqlQuery) {
    try {
        const response = await axios.get(SPARQL_ENDPOINT, {
            params: {
                query: sparqlQuery,
                format: "application/json",
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error querying DBpedia:", error.message);
        throw error;
    }
}

// Function to find pages based on a name
async function findPagesByName(name) {
    const query = `
        SELECT ?entity ?comment ?label
        WHERE {{
            ?entity rdfs:label ?label ;
                    rdfs:comment ?comment .
            ?label bif:contains "${name}" OPTION (score ?sc , score_limit 15) 
        FILTER langMatches(lang(?label),'en')
        FILTER langmatches(lang(?comment), 'en')
    }}
    `;
    const results = await queryDbpedia(query);
    return await results.results.bindings;
}

function getPageByName(name) {
    const results = findPagesByName(name);
    if (!results || results.length === 0) {
        return { error: 'No results found', status: 404 };
    }
    return results;
}


// Function to get a resource from a URI
async function getResourceFromUri(uri) {
    const query = `
       SELECT ?property ?hasValue 
        WHERE {{ <${uri}> ?property ?hasValue
        FILTER (
            (isIRI(?hasValue) ||  
            (lang(?hasValue) = "en") ||  
            (!langMatches(lang(?hasValue), "*")))  
            &&
            ?property NOT IN (rdf:type, foaf:depiction, owl:sameAs))
        }}
    `;
    const results = await queryDbpedia(query);
    return await results.results.bindings;
}

function removePrefix(property, prefixes) {
    for (const [prefix, uri] of Object.entries(prefixes)) {
        if (property.startsWith(uri)) {
            return property.replace(uri, ``);
        }
    }
    return property; // Return the original property if no prefix matches
}

// Function to convert RDF data into Markdown
function rdfToMarkdownGrouped(results) {
    const groupedData = {};

    prefixes = {
        rdfs: "http://www.w3.org/2000/01/rdf-schema#",
        rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        owl: "http://www.w3.org/2002/07/owl#",
        foaf: "http://xmlns.com/foaf/0.1/",
        dbpedia: "http://dbpedia.org/resource/",
        dbpedia_owl: "http://dbpedia.org/ontology/",
        skos: "http://www.w3.org/2004/02/skos/core#",
        purl: "http://purl.org/dc/terms/",
        xsd: "http://www.w3.org/2001/XMLSchema#",
        ns: "http://www.w3.org/ns/prov#",
        p_ling: "http://purl.org/linguistics/gold/",
        dpbedia_prop: "http://dbpedia.org/property/"
    };

    // Group values by property
    results.forEach((binding) => {
        const property = binding.property.value;
        const value = binding.hasValue.value;

        // Remove prefixes from the property
        const cleanProperty = removePrefix(property, prefixes);

        if (!groupedData[cleanProperty]) {
            groupedData[cleanProperty] = [];
        }
        groupedData[cleanProperty].push(value);
    });

    // Generate Markdown
    let markdown = "";
    markdown += `# ` + groupedData["label"] + `\n\n`;
    markdown += '## Abstract \n\n';
    markdown += groupedData["abstract"] + `\n\n`;

    delete groupedData["label"];
    delete groupedData["abstract"]; 
    delete groupedData["comment"];  
    
    for (const [property, values] of Object.entries(groupedData)) {
        markdown += `## ${property}\n\n`;
        values.forEach((value) => {
            markdown += `- ${value}\n`;
        });
        markdown += `\n`;
    }

    return groupedData[`label`], markdown;
}

module.exports = {
    findPagesByName,
    getResourceFromUri,
    rdfToMarkdownGrouped,
};

// Function to get a resource and return Markdown
function getResourceAndReturnMarkdown(uri) {
    const results = getResourceFromUri(uri);
    if (!results || results.length === 0) {
        throw new Error("No results found for the given URI");
    }
    return rdfToMarkdownGrouped(results);
}