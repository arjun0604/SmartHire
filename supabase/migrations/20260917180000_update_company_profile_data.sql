UPDATE companies
SET industry = COALESCE(industry, 'Technology & Cloud Computing'),
    company_size = COALESCE(company_size, '10,000+ employees'),
    headquarters = COALESCE(headquarters, 'Mountain View, California, USA'),
    description = COALESCE(description, 'Google LLC is an American multinational technology company focusing on artificial intelligence, online advertising, search engine technology, cloud computing, computer software, quantum computing, e-commerce, and consumer electronics.'),
    founded_year = COALESCE(founded_year, 1998),
    website = COALESCE(website, 'https://about.google'),
    linkedin = COALESCE(linkedin, 'https://linkedin.com/company/google')
WHERE name = 'Google LLC';

UPDATE companies
SET industry = COALESCE(industry, 'Enterprise Software & AI'),
    company_size = COALESCE(company_size, '51–200 employees'),
    headquarters = COALESCE(headquarters, 'San Francisco, California, USA'),
    description = COALESCE(description, 'Acme Innovations builds intelligent enterprise software solutions, automating complex workflows and accelerating technological innovation for global businesses.'),
    founded_year = COALESCE(founded_year, 2021),
    website = COALESCE(website, 'https://acmeinnovations.example.com'),
    linkedin = COALESCE(linkedin, 'https://linkedin.com/company/acme-innovations')
WHERE name = 'Acme Innovations';
