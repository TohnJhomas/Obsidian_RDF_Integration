# G8
Author: John Thomas    
Date: May 21st

## About:
 The goal for this tool is to facilitate access to existing semantic information to the users of the linked note taking tool Obsidian. The usage of this tool will be through the existing Plugin function of Obsidian, and will allow users to search for a keyword or concept, and pull dbpedia concepts into their notes based on the results of that search. This can provide a starting point for more personalized notes or enrich existing pages with publicly available information


## Methodology:
### Creation: 
- Identify key use-cases for the given rdf data available in dbpedia
- Map properties to human-readable markdown format based on use case
- Test format with several queries to various types of dbpedia objects


### Maintenance: 
- Opensource the RDF-to-Markdown conversion script
- Depending on feasibility, use .config file to allow manual adjustment of imported fields


## Access:
Download plugin from Obsidian plugin marketplace
Search for keyword in plugin 
Select desired concept from list of identified matches
Hit “import” button to populate notebook page


## Structure: 
There are a lot of properties associated with dbpedia RDF objects, but some of the key ones being pulled into the markdown document are: 
- Label - this becomes the title of the page, or is input as a level 1 heading
- Wiki Link - this is the link to the original wikipedia article about this subject. 
- Abstract - this is the long description of the object, and is the primary body text of the selected page
- Related Links - using the schema field `http://dbpedia.org/ontology/wikiPageWikiLink` we pull a list of related dbpedia concepts that can either be linked to new obsidian pages or left as links out into dbpedia itself. 

From these primary concepts, the rest of the fields are domain-specific, but some of the ones that have been selected for intake are “population” “area” and “country” for cities, and “birth date” “birthplace” and “death date” and “place of death” for people. 


Example: Show example request and response for at least one intended use of information that demonstrates access and structure:


The original request for the below output would be: 
```
SELECT ?entity ?comment 
    WHERE { 
       ?entity rdfs:label ?label ;
           rdfs:comment ?comment .
       ?label bif:contains "Product" OPTION (score ?sc , score_limit 15) 
  FILTER langMatches(lang(?label),'en')
  FILTER langmatches(lang(?comment), 'en')
    }
```

this outputs a list of concepts that contain the selected term "Product." This list is quite long, and is structured as follows: 
```json
 {"head": { "link": [], "vars": ["entity"] },
  "results": { "distinct": false, "ordered": true, "bindings": [
    { "entity": { "type": "uri", "value": "http://dbpedia.org/resource/Product_(business)" }}
    ] } }
```
For the sake of conciseness, I've only displayed the topic of interest. the above list is presented to the user and they're allowed to make a selection from the list for what is relevant, and a second query will be run: 

```
SELECT ?property ?hasValue ?isValueOf
WHERE {{ <http://dbpedia.org/resource/Product_(business)> ?property ?hasValue
 FILTER (
      (isIRI(?hasValue) ||  # Keep URIs (no language tag)
      (lang(?hasValue) = "en") ||  # Keep English literals
      (!langMatches(lang(?hasValue), "*")))  # Keep literals without language tag
      &&
      ?property NOT IN (rdf:type, foaf:depiction, owl:sameAs))
}}
```

This will scrape a list of all the properties of a given entity, which are then formatted into markdown to be prepared for injection into the document. 

Once the user approves the selection, it is input into either the currently open notetaking page, or into a new page. 