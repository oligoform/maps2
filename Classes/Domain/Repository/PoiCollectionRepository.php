<?php
namespace JWeiland\Maps2\Domain\Repository;

/**
 * This file is part of the TYPO3 CMS project.
 *
 * It is free software; you can redistribute it and/or modify it under
 * the terms of the GNU General Public License, either version 2
 * of the License, or any later version.
 *
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 *
 * The TYPO3 project - inspiring people to share!
 */
use TYPO3\CMS\Core\Database\PreparedStatement;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Extbase\Persistence\Generic\Query;
use TYPO3\CMS\Extbase\Persistence\Repository;
use TYPO3\CMS\Extbase\Service\EnvironmentService;
use TYPO3\CMS\Frontend\Page\PageRepository;

/**
 * Class PoiCollectionRepository
 *
 * @category Domain/Repository
 * @package  Maps2
 * @author   Stefan Froemken <projects@jweiland.net>
 * @license  http://www.gnu.org/licenses/gpl.html GNU General Public License
 * @link     https://github.com/jweiland-net/maps2
 */
class PoiCollectionRepository extends Repository
{
    /**
     * The TYPO3 page repository. Used for language and workspace overlay
     *
     * @var PageRepository
     */
    protected $pageRepository;

    /**
     * @var EnvironmentService
     */
    protected $environmentService;

    /**
     * inject environmentService
     *
     * @param EnvironmentService $environmentService
     * @return void
     */
    public function injectEnvironmentService(EnvironmentService $environmentService)
    {
        $this->environmentService = $environmentService;
    }

    /**
     * @return \TYPO3\CMS\Frontend\Page\PageRepository
     */
    protected function getPageRepository()
    {
        if (!$this->pageRepository instanceof PageRepository) {
            if ($this->environmentService->isEnvironmentInFrontendMode() && is_object($GLOBALS['TSFE'])) {
                $this->pageRepository = $GLOBALS['TSFE']->sys_page;
            } else {
                $this->pageRepository = GeneralUtility::makeInstance('TYPO3\\CMS\\Frontend\\Page\\PageRepository');
            }
        }
        return $this->pageRepository;
    }

    /**
     * search for poi collections within a given radius
     *
     * @param float $latitude the users position
     * @param float $longitude the users position
     * @param int $radius The range to search for poi collections (km)
     * @return \TYPO3\CMS\Extbase\Persistence\QueryResultInterface
     */
    public function searchWithinRadius($latitude, $longitude, $radius)
    {
        $radiusOfEarth = 6380;
        /** @var Query $query */
        $query = $this->createQuery();
        $sql = '
            SELECT *, ACOS(SIN(RADIANS(?)) * SIN(RADIANS(latitude)) + COS(RADIANS(?)) * COS(RADIANS(latitude)) * COS(RADIANS(?) - RADIANS(longitude))) * ? AS distance
            FROM tx_maps2_domain_model_poicollection
            WHERE collection_type = "Point"
            AND tx_maps2_domain_model_poicollection.pid IN (' . implode(',', $query->getQuerySettings()->getStoragePageIds()) . ')' .
            $this->getPageRepository()->enableFields('tx_maps2_domain_model_poicollection') . '
            HAVING distance < ?
            ORDER BY distance;';

        /** @var PreparedStatement $preparedStatement */
        $preparedStatement = $this->objectManager->get(
            'TYPO3\\CMS\\Core\\Database\\PreparedStatement',
            $sql,
            'tx_maps2_domain_model_poicollection'
        );

        return $query->statement(
            $preparedStatement,
            array($latitude, $latitude, $longitude, $radiusOfEarth, $radius)
        )->execute();
    }

    /**
     * find all pois selected by categories
     *
     * @param string $categories comma separated list of category uids
     * @return \TYPO3\CMS\Extbase\Persistence\QueryResultInterface
     */
    public function findPoisByCategories($categories)
    {
        /** @var Query $query */
        $query = $this->createQuery();
        $orConstraint = array();
        foreach (GeneralUtility::trimExplode(',', $categories) as $category) {
            $orConstraint[] = $query->contains('categories', $category);
        }
        return $query->matching(
            $query->logicalOr($orConstraint)
        )->execute();
    }
}
